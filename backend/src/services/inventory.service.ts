import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { InventoryLot, IInventoryLot } from '../models/InventoryLot';
import { StockMovement } from '../models/StockMovement';
import { StockCount } from '../models/StockCount';
import { StoreSettings } from '../models/StoreSettings';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { UserRole } from '../types/roles';

export class InventoryService {
  /**
   * Get store inventory summary metrics
   */
  static async getSummary() {
    const [totalProducts, lowStockProducts, outOfStockProducts, expiringLots, inventoryValuation] =
      await Promise.all([
        Product.countDocuments({ isArchived: false }),
        Product.countDocuments({
          isArchived: false,
          $expr: {
            $and: [
              { $lte: ['$currentStock', '$minStockLevel'] },
              { $gt: ['$currentStock', 0] }
            ]
          }
        }),
        Product.countDocuments({ isArchived: false, currentStock: { $lte: 0 } }),
        InventoryLot.countDocuments({
          status: 'active',
          remainingQuantity: { $gt: 0 },
          expirationDate: {
            $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
          }
        }),
        Product.aggregate([
          { $match: { isArchived: false } },
          {
            $group: {
              _id: null,
              totalCostValue: { $sum: { $multiply: ['$costPrice', '$currentStock'] } },
              totalRetailValue: { $sum: { $multiply: ['$sellingPrice', '$currentStock'] } },
              totalStockUnits: { $sum: '$currentStock' }
            }
          }
        ])
      ]);

    const valuation = inventoryValuation[0] || {
      totalCostValue: 0,
      totalRetailValue: 0,
      totalStockUnits: 0
    };

    return {
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      expiringLotsCount: expiringLots,
      totalStockUnits: valuation.totalStockUnits,
      totalCostValue: Number(valuation.totalCostValue.toFixed(2)),
      totalRetailValue: Number(valuation.totalRetailValue.toFixed(2))
    };
  }

  /**
   * List inventory lots with filtering
   */
  static async getLots(query: {
    productId?: string;
    status?: string;
    expiringWithinDays?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.productId) filter.productId = new mongoose.Types.ObjectId(query.productId);
    if (query.status) filter.status = query.status;

    if (query.expiringWithinDays) {
      const targetDate = new Date(Date.now() + Number(query.expiringWithinDays) * 24 * 60 * 60 * 1000);
      filter.expirationDate = { $lte: targetDate };
      filter.remainingQuantity = { $gt: 0 };
    }

    const [lots, total] = await Promise.all([
      InventoryLot.find(filter)
        .populate('productId', 'name sku barcode isExpiringProduct')
        .populate('supplierId', 'companyName')
        .sort({ expirationDate: 1, receivedDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InventoryLot.countDocuments(filter)
    ]);

    return {
      lots,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   * Products below reorder threshold
   */
  static async getLowStockProducts() {
    return Product.find({
      isArchived: false,
      $expr: { $lte: ['$currentStock', '$minStockLevel'] }
    })
      .populate('category', 'name')
      .populate('unit', 'symbol')
      .populate('defaultSupplier', 'companyName phone')
      .sort({ currentStock: 1 })
      .lean();
  }

  /**
   * Products expiring soon or already expired
   */
  static async getExpiringProducts(daysAhead = 30) {
    const targetDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    return InventoryLot.find({
      status: 'active',
      remainingQuantity: { $gt: 0 },
      expirationDate: { $lte: targetDate }
    })
      .populate('productId', 'name sku barcode')
      .populate('supplierId', 'companyName')
      .sort({ expirationDate: 1 })
      .lean();
  }

  /**
   * Stock movement history
   */
  static async getStockMovements(query: {
    productId?: string;
    movementType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.productId) filter.productId = new mongoose.Types.ObjectId(query.productId);
    if (query.movementType) filter.movementType = query.movementType;

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    const [movements, total] = await Promise.all([
      StockMovement.find(filter)
        .populate('productId', 'name sku barcode')
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StockMovement.countDocuments(filter)
    ]);

    return {
      movements,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   * Manual Stock adjustment (damage, shrinkage, manual correction)
   */
  static async adjustStock(
    data: {
      productId: string;
      lotId?: string;
      quantity: number; // Positive to add, negative to subtract
      reason: string;
      notes?: string;
    },
    userId: string,
    session?: mongoose.ClientSession | null
  ) {
    const product = await Product.findById(data.productId).session(session || null);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const previousStock = product.currentStock;
    const newStock = previousStock + data.quantity;

    if (newStock < 0) {
      throw new ValidationError(
        `Cannot deduct ${Math.abs(data.quantity)} units. Current stock is only ${previousStock}.`
      );
    }

    product.currentStock = newStock;
    await product.save({ session: session || null });

    // If specific lot specified, adjust lot remaining quantity
    if (data.lotId) {
      const lot = await InventoryLot.findById(data.lotId).session(session || null);
      if (lot) {
        lot.remainingQuantity = Math.max(0, lot.remainingQuantity + data.quantity);
        if (lot.remainingQuantity === 0) {
          lot.status = 'depleted';
        }
        await lot.save({ session: session || null });
      }
    }

    const movement = await StockMovement.create(
      [
        {
          productId: product._id,
          lotId: data.lotId ? new mongoose.Types.ObjectId(data.lotId) : undefined,
          movementType: 'ADJUSTMENT',
          quantity: data.quantity,
          previousStock,
          newStock,
          unitCost: product.costPrice,
          reason: data.reason,
          performedBy: new mongoose.Types.ObjectId(userId),
          notes: data.notes
        }
      ],
      { session: session || null }
    );

    // Check low stock trigger
    if (newStock <= product.minStockLevel) {
      await NotificationService.createNotification({
        title: 'Low Stock Alert',
        message: `Product "${product.name}" (SKU: ${product.sku}) is at ${newStock} units (Threshold: ${product.minStockLevel}).`,
        type: 'LOW_STOCK',
        targetRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_MANAGER],
        data: { productId: product._id, currentStock: newStock }
      });
    }

    await AuditService.log({
      actorId: userId,
      action: 'STOCK_ADJUSTMENT',
      entity: 'Product',
      entityId: (product._id as any).toString(),
      changes: { quantity: data.quantity, previousStock, newStock, reason: data.reason }
    });

    return { product, movement: movement[0] };
  }

  /**
   * FEFO (First-Expired, First-Out) stock allocation algorithm
   * Selects active, non-expired lots ordered by expiration date, then receiving date.
   */
  static async allocateLotsFEFO(
    productId: string,
    requestedQuantity: number,
    session?: mongoose.ClientSession | null
  ): Promise<Array<{ lotId: mongoose.Types.ObjectId; batchNumber: string; quantity: number; unitCost: number }>> {
    const now = new Date();

    // Query active lots with remaining quantity, preventing expired lots from being sold
    const activeLots = await InventoryLot.find({
      productId: new mongoose.Types.ObjectId(productId),
      status: 'active',
      remainingQuantity: { $gt: 0 },
      $or: [
        { expirationDate: { $gt: now } },
        { expirationDate: { $exists: false } },
        { expirationDate: null }
      ]
    })
      .sort({ expirationDate: 1, receivedDate: 1 })
      .session(session || null);

    const allocations: Array<{
      lotId: mongoose.Types.ObjectId;
      batchNumber: string;
      quantity: number;
      unitCost: number;
    }> = [];

    let unallocated = requestedQuantity;

    for (const lot of activeLots) {
      if (unallocated <= 0) break;

      const take = Math.min(lot.remainingQuantity, unallocated);
      lot.remainingQuantity -= take;
      if (lot.remainingQuantity === 0) {
        lot.status = 'depleted';
      }
      await lot.save({ session: session || null });

      allocations.push({
        lotId: lot._id as any,
        batchNumber: lot.batchNumber,
        quantity: take,
        unitCost: lot.unitCost
      });

      unallocated -= take;
    }

    // If active lots didn't cover the entire requested quantity (e.g. untracked lots or pre-existing stock)
    if (unallocated > 0) {
      // Create a default allocation reference
      const product = await Product.findById(productId).session(session || null);
      allocations.push({
        lotId: new mongoose.Types.ObjectId(), // Virtual reference
        batchNumber: 'GENERAL_STOCK',
        quantity: unallocated,
        unitCost: product ? product.costPrice : 0
      });
    }

    return allocations;
  }

  /* ======================== PHYSICAL STOCK COUNTS ======================== */

  static async getStockCounts(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [counts, total] = await Promise.all([
      StockCount.find()
        .populate('countedBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StockCount.countDocuments()
    ]);
    return { counts, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async getStockCountById(id: string) {
    const count = await StockCount.findById(id)
      .populate('countedBy', 'name email')
      .populate('approvedBy', 'name email');
    if (!count) throw new NotFoundError('Stock count record not found');
    return count;
  }

  static async createStockCount(
    data: { items: Array<{ productId: string; countedStock: number }>; notes?: string },
    userId: string
  ) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countNumber = `SC-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

    const productIds = data.items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map((p) => [(p._id as any).toString(), p]));

    let totalSystemStock = 0;
    let totalCountedStock = 0;
    let totalDiscrepancyValue = 0;

    const items = data.items.map((item) => {
      const prod = productMap.get(item.productId);
      const systemStock = prod ? prod.currentStock : 0;
      const discrepancy = item.countedStock - systemStock;
      const unitCost = prod ? prod.costPrice : 0;
      const discrepancyValue = Number((discrepancy * unitCost).toFixed(2));

      totalSystemStock += systemStock;
      totalCountedStock += item.countedStock;
      totalDiscrepancyValue += discrepancyValue;

      return {
        productId: new mongoose.Types.ObjectId(item.productId),
        productName: prod ? prod.name : 'Unknown Product',
        sku: prod ? prod.sku : 'N/A',
        systemStock,
        countedStock: item.countedStock,
        discrepancy,
        unitCost,
        discrepancyValue
      };
    });

    const stockCount = await StockCount.create({
      countNumber,
      items,
      totalSystemStock,
      totalCountedStock,
      totalDiscrepancyValue: Number(totalDiscrepancyValue.toFixed(2)),
      countedBy: new mongoose.Types.ObjectId(userId),
      notes: data.notes,
      status: 'draft'
    });

    await AuditService.log({
      actorId: userId,
      action: 'STOCK_COUNT_CREATED',
      entity: 'StockCount',
      entityId: (stockCount._id as any).toString()
    });

    return stockCount;
  }

  static async submitStockCount(id: string, userId: string) {
    const count = await StockCount.findById(id);
    if (!count) throw new NotFoundError('Stock count not found');
    if (count.status !== 'draft') {
      throw new ConflictError(`Stock count is already ${count.status}`);
    }

    count.status = 'submitted';
    count.submittedAt = new Date();
    await count.save();

    await NotificationService.createNotification({
      title: 'Physical Stock Count Submitted for Approval',
      message: `Stock count #${count.countNumber} submitted with total discrepancy variance of $${count.totalDiscrepancyValue}.`,
      type: 'SYSTEM_ALERT',
      targetRoles: [UserRole.ADMIN, UserRole.MANAGER],
      data: { countId: count._id }
    });

    return count;
  }

  static async approveStockCount(id: string, userId: string, notes?: string) {
    const count = await StockCount.findById(id);
    if (!count) throw new NotFoundError('Stock count not found');
    if (count.status !== 'submitted') {
      throw new ConflictError(`Stock count must be in 'submitted' status to approve. Current: ${count.status}`);
    }

    // Apply adjustments to products
    for (const item of count.items) {
      if (item.discrepancy !== 0) {
        const product = await Product.findById(item.productId);
        if (product) {
          const previousStock = product.currentStock;
          product.currentStock = item.countedStock;
          await product.save();

          await StockMovement.create({
            productId: product._id,
            movementType: 'PHYSICAL_COUNT',
            quantity: item.discrepancy,
            previousStock,
            newStock: item.countedStock,
            unitCost: item.unitCost,
            referenceType: 'StockCount',
            referenceId: count._id,
            reason: `Physical count variance reconciliation (${count.countNumber})`,
            performedBy: new mongoose.Types.ObjectId(userId)
          });
        }
      }
    }

    count.status = 'approved';
    count.approvedBy = new mongoose.Types.ObjectId(userId);
    count.approvedAt = new Date();
    if (notes) count.notes = (count.notes ? count.notes + ' | ' : '') + notes;
    await count.save();

    await AuditService.log({
      actorId: userId,
      action: 'STOCK_COUNT_APPROVED',
      entity: 'StockCount',
      entityId: id,
      changes: { totalDiscrepancyValue: count.totalDiscrepancyValue }
    });

    return count;
  }
}
