import mongoose from 'mongoose';
import { Purchase, IPurchase } from '../models/Purchase';
import { Product } from '../models/Product';
import { InventoryLot } from '../models/InventoryLot';
import { StockMovement } from '../models/StockMovement';
import { Supplier } from '../models/Supplier';
import { generateOrderNumber } from '../utils/crypto';
import { withTransaction } from '../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { UserRole } from '../types/roles';

export class PurchaseService {
  /**
   * List purchase orders
   */
  static async getPurchases(query: {
    page?: number;
    limit?: number;
    supplierId?: string;
    status?: string;
  }) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.supplierId) filter.supplierId = new mongoose.Types.ObjectId(query.supplierId);
    if (query.status) filter.status = query.status;

    const [purchases, total] = await Promise.all([
      Purchase.find(filter)
        .populate('supplierId', 'companyName name phone')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Purchase.countDocuments(filter)
    ]);

    return {
      purchases,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static async getPurchaseById(id: string) {
    const purchase = await Purchase.findById(id)
      .populate('supplierId', 'companyName name email phone address')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('receivedBy', 'name email');
    if (!purchase) throw new NotFoundError('Purchase order not found');
    return purchase;
  }

  /**
   * Create Purchase Order in 'draft' status (Does NOT increase stock!)
   */
  static async createPurchase(
    data: {
      supplierId: string;
      items: Array<{
        productId: string;
        orderedQuantity: number;
        unitCost: number;
        taxRate?: number;
      }>;
      expectedDeliveryDate?: string;
      notes?: string;
    },
    userId: string
  ) {
    const supplier = await Supplier.findById(data.supplierId);
    if (!supplier) throw new NotFoundError('Supplier not found');

    const productIds = data.items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [(p._id as any).toString(), p]));

    let subtotal = 0;
    let taxTotal = 0;

    const items = data.items.map((item) => {
      const prod = productMap.get(item.productId);
      if (!prod) throw new NotFoundError(`Product not found: ${item.productId}`);

      const itemSubtotal = Number((item.orderedQuantity * item.unitCost).toFixed(2));
      const taxRate = item.taxRate || 0;
      const itemTax = Number(((itemSubtotal * taxRate) / 100).toFixed(2));
      const total = Number((itemSubtotal + itemTax).toFixed(2));

      subtotal += itemSubtotal;
      taxTotal += itemTax;

      return {
        productId: prod._id as any,
        productName: prod.name,
        sku: prod.sku,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: 0,
        unitCost: item.unitCost,
        taxRate,
        subtotal: itemSubtotal,
        total
      };
    });

    const grandTotal = Number((subtotal + taxTotal).toFixed(2));
    const purchaseOrderNumber = generateOrderNumber('PO');

    const purchase = await Purchase.create({
      purchaseOrderNumber,
      supplierId: supplier._id,
      status: 'draft',
      items,
      subtotal: Number(subtotal.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      grandTotal,
      paidAmount: 0,
      paymentStatus: 'unpaid',
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
      createdBy: new mongoose.Types.ObjectId(userId),
      notes: data.notes
    });

    await AuditService.log({
      actorId: userId,
      action: 'PURCHASE_ORDER_CREATED',
      entity: 'Purchase',
      entityId: (purchase._id as any).toString(),
      changes: { purchaseOrderNumber, grandTotal }
    });

    return purchase;
  }

  /**
   * Approve a draft purchase order
   */
  static async approvePurchase(id: string, userId: string) {
    const purchase = await Purchase.findById(id);
    if (!purchase) throw new NotFoundError('Purchase order not found');

    if (purchase.status !== 'draft') {
      throw new ConflictError(`Purchase order is already ${purchase.status}`);
    }

    purchase.status = 'approved';
    purchase.approvedBy = new mongoose.Types.ObjectId(userId);
    await purchase.save();

    await AuditService.log({
      actorId: userId,
      action: 'PURCHASE_ORDER_APPROVED',
      entity: 'Purchase',
      entityId: id
    });

    return purchase;
  }

  /**
   * Receive items (Partial or Full): Increases stock ONLY for actual received quantity
   * Creates InventoryLot and StockMovement records atomically.
   */
  static async receiveGoods(
    id: string,
    receivedItems: Array<{
      productId: string;
      receivedQuantity: number;
      batchNumber?: string;
      expirationDate?: string;
    }>,
    userId: string
  ) {
    return await withTransaction(async (session) => {
      const purchase = await Purchase.findById(id).session(session || null);
      if (!purchase) throw new NotFoundError('Purchase order not found');

      if (['received', 'cancelled'].includes(purchase.status)) {
        throw new ConflictError(`Cannot receive goods on purchase order with status "${purchase.status}"`);
      }

      let anyNewItemsReceived = false;

      for (const rxItem of receivedItems) {
        if (rxItem.receivedQuantity <= 0) continue;

        const lineItem = purchase.items.find(
          (item) => (item.productId as any).toString() === rxItem.productId
        );

        if (!lineItem) {
          throw new ValidationError(`Product ${rxItem.productId} is not part of this purchase order.`);
        }

        const remainingToReceive = lineItem.orderedQuantity - lineItem.receivedQuantity;
        if (rxItem.receivedQuantity > remainingToReceive) {
          throw new ValidationError(
            `Received quantity ${rxItem.receivedQuantity} exceeds remaining order balance of ${remainingToReceive} for ${lineItem.productName}.`
          );
        }

        anyNewItemsReceived = true;
        lineItem.receivedQuantity += rxItem.receivedQuantity;

        // 1. Update Product stock & latest cost price
        const product = await Product.findById(lineItem.productId).session(session || null);
        if (!product) throw new NotFoundError(`Product ${lineItem.productId} not found`);

        const previousStock = product.currentStock;
        product.currentStock += rxItem.receivedQuantity;
        product.costPrice = lineItem.unitCost; // Update reference unit cost
        await product.save({ session: session || null });

        // 2. Create InventoryLot record
        const batchNum = rxItem.batchNumber || `BATCH-${Date.now().toString().slice(-6)}`;
        const lot = await InventoryLot.create(
          [
            {
              productId: product._id,
              batchNumber: batchNum,
              quantityReceived: rxItem.receivedQuantity,
              remainingQuantity: rxItem.receivedQuantity,
              unitCost: lineItem.unitCost,
              expirationDate: rxItem.expirationDate ? new Date(rxItem.expirationDate) : undefined,
              receivedDate: new Date(),
              supplierId: purchase.supplierId,
              purchaseId: purchase._id,
              status: 'active'
            }
          ],
          { session: session || null }
        );

        // 3. Create StockMovement record
        await StockMovement.create(
          [
            {
              productId: product._id,
              lotId: lot[0]._id,
              movementType: 'PURCHASE_RECEIPT',
              quantity: rxItem.receivedQuantity,
              previousStock,
              newStock: product.currentStock,
              unitCost: lineItem.unitCost,
              referenceType: 'Purchase',
              referenceId: purchase._id,
              reason: `Received under PO ${purchase.purchaseOrderNumber} (Batch: ${batchNum})`,
              performedBy: new mongoose.Types.ObjectId(userId)
            }
          ],
          { session: session || null }
        );
      }

      if (!anyNewItemsReceived) {
        throw new ValidationError('No valid received quantities provided.');
      }

      // Check if all items are fully received
      const isFullyReceived = purchase.items.every(
        (item) => item.receivedQuantity >= item.orderedQuantity
      );

      purchase.status = isFullyReceived ? 'received' : 'partially_received';
      purchase.receivedBy = new mongoose.Types.ObjectId(userId);
      purchase.receivedAt = new Date();
      await purchase.save({ session: session || null });

      // Notify warehouse/managers of received stock
      await NotificationService.createNotification({
        title: 'Goods Received',
        message: `PO #${purchase.purchaseOrderNumber} status updated to: ${purchase.status}. Stock added to inventory.`,
        type: 'PURCHASE_RECEIVED',
        targetRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_MANAGER],
        data: { purchaseId: purchase._id }
      });

      await AuditService.log({
        actorId: userId,
        action: 'PURCHASE_GOODS_RECEIVED',
        entity: 'Purchase',
        entityId: id,
        changes: { status: purchase.status, receivedItems }
      });

      return purchase;
    });
  }

  /**
   * Cancel purchase order
   */
  static async cancelPurchase(id: string, reason: string, userId: string) {
    const purchase = await Purchase.findById(id);
    if (!purchase) throw new NotFoundError('Purchase order not found');

    if (purchase.status === 'received' || purchase.status === 'partially_received') {
      throw new ConflictError(
        'Cannot cancel a purchase order that has already received stock. Use supplier return instead.'
      );
    }

    purchase.status = 'cancelled';
    purchase.cancelReason = reason;
    await purchase.save();

    await AuditService.log({
      actorId: userId,
      action: 'PURCHASE_ORDER_CANCELLED',
      entity: 'Purchase',
      entityId: id,
      changes: { reason }
    });

    return purchase;
  }
}
