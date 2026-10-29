import mongoose from 'mongoose';
import { Sale, ISale, ISaleItem } from '../models/Sale';
import { Product } from '../models/Product';
import { Payment } from '../models/Payment';
import { StockMovement } from '../models/StockMovement';
import { StoreSettings } from '../models/StoreSettings';
import { Coupon } from '../models/Coupon';
import { Customer } from '../models/Customer';
import { LoyaltyTransaction } from '../models/LoyaltyTransaction';
import { CashierShift } from '../models/CashierShift';
import { InventoryService } from './inventory.service';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { generateReceiptNumber } from '../utils/crypto';
import { withTransaction } from '../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { emitToAll } from '../sockets/socket';
import { UserRole } from '../types/roles';

export interface CheckoutInput {
  items: Array<{
    productId: string;
    quantity: number;
    discount?: number;
  }>;
  payments: Array<{
    method: 'CASH' | 'CARD' | 'EVC_PLUS' | 'EDAHAB' | 'ZAAD' | 'BANK_TRANSFER';
    amount: number;
    reference?: string;
  }>;
  customerId?: string;
  shiftId?: string;
  couponCode?: string;
  redeemLoyaltyPoints?: number;
  idempotencyKey?: string;
  offlineSyncId?: string;
  notes?: string;
}

export class PosService {
  /**
   * Safe, atomic POS checkout with server recalculation and FEFO lot deduction
   */
  static async checkout(input: CheckoutInput, cashierId: string) {
    // 1. Idempotency Check: prevent duplicate checkout submissions
    if (input.idempotencyKey) {
      const existingSale = await Sale.findOne({ idempotencyKey: input.idempotencyKey });
      if (existingSale) {
        return {
          isDuplicate: true,
          sale: existingSale,
          receiptNumber: existingSale.receiptNumber
        };
      }
    }

    return await withTransaction(async (session) => {
      // 2. Fetch supermarket settings
      const settings = await StoreSettings.findOne().session(session || null);
      const defaultTaxRate = settings?.defaultTaxRate ?? 5;

      // 3. Validate items and recalculate totals server-side
      const productIds = input.items.map((i) => i.productId);
      const products = await Product.find({ _id: { $in: productIds }, isArchived: false }).session(
        session || null
      );
      const productMap = new Map(products.map((p) => [(p._id as any).toString(), p]));

      const saleItems: ISaleItem[] = [];
      let calculatedSubtotal = 0;
      let calculatedTaxTotal = 0;
      let calculatedDiscountTotal = 0;

      for (const itemInput of input.items) {
        const product = productMap.get(itemInput.productId);
        if (!product) {
          throw new NotFoundError(`Product not found or archived: ${itemInput.productId}`);
        }

        if (product.currentStock < itemInput.quantity) {
          throw new ValidationError(
            `Insufficient stock for "${product.name}". Available: ${product.currentStock}, Requested: ${itemInput.quantity}`
          );
        }

        const unitPrice = product.sellingPrice;
        const itemDiscount = itemInput.discount || 0;
        const netUnitPrice = Math.max(0, unitPrice - itemDiscount);
        const itemSubtotal = Number((netUnitPrice * itemInput.quantity).toFixed(2));
        const itemTax = Number(((itemSubtotal * (product.taxRate || defaultTaxRate)) / 100).toFixed(2));
        const itemTotal = Number((itemSubtotal + itemTax).toFixed(2));

        // Concurrency-safe stock deduction using atomic MongoDB update
        const updated = await Product.findOneAndUpdate(
          { _id: product._id, currentStock: { $gte: itemInput.quantity } },
          { $inc: { currentStock: -itemInput.quantity } },
          { new: true, session: session || null }
        );

        if (!updated) {
          throw new ConflictError(
            `Stock conflict for product "${product.name}". Another transaction claimed the remaining units. Please refresh cart.`
          );
        }

        // FEFO allocation for inventory lots
        const allocatedLots = await InventoryService.allocateLotsFEFO(
          (product._id as any).toString(),
          itemInput.quantity,
          session
        );

        calculatedSubtotal += itemSubtotal;
        calculatedTaxTotal += itemTax;
        calculatedDiscountTotal += itemDiscount * itemInput.quantity;

        saleItems.push({
          productId: product._id as any,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          quantity: itemInput.quantity,
          unitPrice,
          costPrice: product.costPrice,
          discount: itemDiscount,
          taxRate: product.taxRate || defaultTaxRate,
          taxAmount: itemTax,
          subtotal: itemSubtotal,
          total: itemTotal,
          allocatedLots
        });
      }

      // 4. Handle Coupon discount
      let couponDiscount = 0;
      if (input.couponCode) {
        const coupon = await Coupon.findOne({
          code: input.couponCode.toUpperCase().trim(),
          isActive: true,
          expiryDate: { $gt: new Date() }
        }).session(session || null);

        if (!coupon) {
          throw new ValidationError(`Coupon '${input.couponCode}' is invalid or expired.`);
        }

        if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) {
          throw new ValidationError(`Coupon '${input.couponCode}' usage limit has been reached.`);
        }

        if (calculatedSubtotal < coupon.minOrderValue) {
          throw new ValidationError(
            `Minimum order value of $${coupon.minOrderValue} required for coupon '${input.couponCode}'.`
          );
        }

        if (coupon.discountType === 'PERCENTAGE') {
          couponDiscount = (calculatedSubtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) {
            couponDiscount = coupon.maxDiscount;
          }
        } else {
          couponDiscount = coupon.discountValue;
        }

        couponDiscount = Number(couponDiscount.toFixed(2));
        calculatedDiscountTotal += couponDiscount;

        // Increment coupon times used
        coupon.timesUsed += 1;
        await coupon.save({ session: session || null });
      }

      // 5. Handle Loyalty Points Redemption
      let loyaltyDiscount = 0;
      let customerDoc: any = null;
      if (input.customerId) {
        customerDoc = await Customer.findById(input.customerId).session(session || null);
        if (customerDoc && input.redeemLoyaltyPoints && input.redeemLoyaltyPoints > 0) {
          if (customerDoc.loyaltyPoints < input.redeemLoyaltyPoints) {
            throw new ValidationError(
              `Customer has only ${customerDoc.loyaltyPoints} points, cannot redeem ${input.redeemLoyaltyPoints}.`
            );
          }
          const redemptionRate = settings?.loyaltyConfig?.redemptionRate ?? 0.01;
          loyaltyDiscount = Number((input.redeemLoyaltyPoints * redemptionRate).toFixed(2));
          calculatedDiscountTotal += loyaltyDiscount;

          customerDoc.loyaltyPoints -= input.redeemLoyaltyPoints;
        }
      }

      const calculatedGrandTotal = Math.max(
        0,
        Number((calculatedSubtotal + calculatedTaxTotal - couponDiscount - loyaltyDiscount).toFixed(2))
      );

      // 6. Validate payments
      const totalPaid = input.payments.reduce((sum, p) => sum + p.amount, 0);
      if (totalPaid < calculatedGrandTotal) {
        throw new ValidationError(
          `Insufficient payment. Total Due: $${calculatedGrandTotal.toFixed(2)}, Paid: $${totalPaid.toFixed(2)}`
        );
      }

      const changeGiven = Number(Math.max(0, totalPaid - calculatedGrandTotal).toFixed(2));
      const receiptNumber = generateReceiptNumber('REC');

      // 7. Persist Sale document
      const sale = new Sale({
        receiptNumber,
        cashierId: new mongoose.Types.ObjectId(cashierId),
        shiftId: input.shiftId ? new mongoose.Types.ObjectId(input.shiftId) : undefined,
        customerId: input.customerId ? new mongoose.Types.ObjectId(input.customerId) : undefined,
        items: saleItems,
        subtotal: Number(calculatedSubtotal.toFixed(2)),
        taxTotal: Number(calculatedTaxTotal.toFixed(2)),
        discountTotal: Number(calculatedDiscountTotal.toFixed(2)),
        grandTotal: calculatedGrandTotal,
        payments: input.payments,
        changeGiven,
        paymentStatus: 'paid',
        status: 'completed',
        idempotencyKey: input.idempotencyKey,
        offlineSyncId: input.offlineSyncId,
        notes: input.notes
      });

      await sale.save({ session: session || null });

      // 8. Persist Payment records
      for (const p of input.payments) {
        await Payment.create(
          [
            {
              paymentNumber: generateReceiptNumber('PAY'),
              transactionType: 'SALE',
              referenceId: sale._id,
              amount: p.amount,
              method: p.method,
              status: 'completed',
              transactionReference: p.reference,
              processedBy: new mongoose.Types.ObjectId(cashierId)
            }
          ],
          { session: session || null }
        );
      }

      // 9. Persist StockMovement records for ledger
      for (const item of saleItems) {
        const product = productMap.get((item.productId as any).toString());
        const previousStock = product ? product.currentStock : item.quantity;
        const newStock = previousStock - item.quantity;

        await StockMovement.create(
          [
            {
              productId: item.productId,
              movementType: 'SALE',
              quantity: -item.quantity,
              previousStock,
              newStock,
              unitCost: item.costPrice,
              referenceType: 'Sale',
              referenceId: sale._id,
              reason: `POS Checkout (${receiptNumber})`,
              performedBy: new mongoose.Types.ObjectId(cashierId)
            }
          ],
          { session: session || null }
        );
      }

      // 10. Update Cashier Shift sales cash & payment summaries
      if (input.shiftId) {
        const shift = await CashierShift.findById(input.shiftId).session(session || null);
        if (shift && shift.status === 'open') {
          for (const p of input.payments) {
            if (p.method === 'CASH') {
              const netCash = p.amount - changeGiven;
              shift.totalSalesCash += Math.max(0, netCash);
            }
            const existingSummary = shift.paymentMethodSummaries.find((s) => s.method === p.method);
            if (existingSummary) {
              existingSummary.totalAmount += p.amount;
              existingSummary.transactionCount += 1;
            } else {
              shift.paymentMethodSummaries.push({
                method: p.method,
                totalAmount: p.amount,
                transactionCount: 1
              });
            }
          }
          await shift.save({ session: session || null });
        }
      }

      // 11. Customer Loyalty Points Earned
      if (customerDoc) {
        const pointsPerDollar = settings?.loyaltyConfig?.pointsPerDollar ?? 1;
        const earnedPoints = Math.floor(calculatedGrandTotal * pointsPerDollar);
        customerDoc.loyaltyPoints += earnedPoints;
        customerDoc.totalSpent += calculatedGrandTotal;
        await customerDoc.save({ session: session || null });

        if (earnedPoints > 0) {
          await LoyaltyTransaction.create(
            [
              {
                customerId: customerDoc._id,
                type: 'EARNED',
                points: earnedPoints,
                monetaryEquivalent: Number((earnedPoints * 0.01).toFixed(2)),
                saleId: sale._id,
                balanceAfter: customerDoc.loyaltyPoints,
                reason: `Points earned from checkout ${receiptNumber}`
              }
            ],
            { session: session || null }
          );
        }
      }

      // Emit real-time sale event via Socket.IO
      emitToAll('sale:completed', {
        receiptNumber: sale.receiptNumber,
        grandTotal: sale.grandTotal,
        itemsCount: sale.items.length,
        cashierId
      });

      return {
        isDuplicate: false,
        sale,
        receiptNumber: sale.receiptNumber
      };
    });
  }

  /**
   * Get sales list with pagination and date filters
   */
  static async getSales(query: {
    page?: number;
    limit?: number;
    cashierId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.cashierId) filter.cashierId = new mongoose.Types.ObjectId(query.cashierId);
    if (query.status) filter.status = query.status;

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .populate('cashierId', 'name email')
        .populate('customerId', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Sale.countDocuments(filter)
    ]);

    return {
      sales,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   * Get sale details by ID
   */
  static async getSaleById(id: string) {
    const sale = await Sale.findById(id)
      .populate('cashierId', 'name email role')
      .populate('customerId', 'name phone email loyaltyPoints');
    if (!sale) throw new NotFoundError('Sale not found');
    return sale;
  }

  /**
   * Void a sale: restores inventory and updates sale status
   */
  static async voidSale(saleId: string, reason: string, userId: string) {
    return await withTransaction(async (session) => {
      const sale = await Sale.findById(saleId).session(session || null);
      if (!sale) throw new NotFoundError('Sale not found');

      if (sale.status === 'voided') {
        throw new ConflictError('Sale is already voided');
      }

      // Restore stock for all items
      for (const item of sale.items) {
        const product = await Product.findById(item.productId).session(session || null);
        if (product) {
          const previousStock = product.currentStock;
          product.currentStock += item.quantity;
          await product.save({ session: session || null });

          await StockMovement.create(
            [
              {
                productId: product._id,
                movementType: 'SALE_RETURN',
                quantity: item.quantity,
                previousStock,
                newStock: product.currentStock,
                unitCost: item.costPrice,
                referenceType: 'Sale',
                referenceId: sale._id,
                reason: `Sale Voided: ${reason} (${sale.receiptNumber})`,
                performedBy: new mongoose.Types.ObjectId(userId)
              }
            ],
            { session: session || null }
          );
        }
      }

      sale.status = 'voided';
      sale.paymentStatus = 'voided';
      sale.voidReason = reason;
      sale.voidedBy = new mongoose.Types.ObjectId(userId);
      sale.voidedAt = new Date();
      await sale.save({ session: session || null });

      await AuditService.log({
        actorId: userId,
        action: 'SALE_VOIDED',
        entity: 'Sale',
        entityId: saleId,
        changes: { reason, receiptNumber: sale.receiptNumber, grandTotal: sale.grandTotal }
      });

      return sale;
    });
  }

  /**
   * Formatted receipt data
   */
  static async getReceipt(saleId: string) {
    const sale = await Sale.findById(saleId)
      .populate('cashierId', 'name')
      .populate('customerId', 'name phone');
    if (!sale) throw new NotFoundError('Sale not found');

    const settings = await StoreSettings.findOne();

    return {
      store: {
        name: settings?.supermarketName || 'Single Supermarket',
        address: settings?.address,
        contact: settings?.contact,
        taxNumber: settings?.taxNumber,
        currency: settings?.currency || 'USD',
        currencySymbol: settings?.currencySymbol || '$',
        receiptConfig: settings?.receiptConfig
      },
      sale: {
        receiptNumber: sale.receiptNumber,
        date: sale.createdAt,
        cashier: (sale.cashierId as any)?.name || 'Cashier',
        customer: (sale.customerId as any)?.name || 'Walk-in Customer',
        items: sale.items,
        subtotal: sale.subtotal,
        taxTotal: sale.taxTotal,
        discountTotal: sale.discountTotal,
        grandTotal: sale.grandTotal,
        payments: sale.payments,
        changeGiven: sale.changeGiven,
        status: sale.status
      }
    };
  }

  /**
   * Offline POS Reconciliation
   * Distinguishes: Accepted, Confirmed, Rejected, Duplicate request, Requires manual review.
   */
  static async reconcileOfflineBatch(
    batch: Array<{
      offlineSyncId: string;
      receiptNumber?: string;
      checkoutData: CheckoutInput;
      queuedAt?: string;
    }>,
    cashierId: string
  ) {
    const results: Array<{
      offlineSyncId: string;
      status: 'CONFIRMED' | 'ACCEPTED' | 'REJECTED' | 'DUPLICATE' | 'REQUIRES_MANUAL_REVIEW';
      receiptNumber?: string;
      message: string;
      details?: any;
    }> = [];

    for (const item of batch) {
      try {
        // 1. Check duplicate sync ID
        const existingSale = await Sale.findOne({ offlineSyncId: item.offlineSyncId });
        if (existingSale) {
          results.push({
            offlineSyncId: item.offlineSyncId,
            status: 'DUPLICATE',
            receiptNumber: existingSale.receiptNumber,
            message: 'Transaction has already been synchronized and processed.'
          });
          continue;
        }

        // 2. Validate current product stock and pricing
        let requiresReview = false;
        let reviewReasons: string[] = [];

        for (const lineItem of item.checkoutData.items) {
          const product = await Product.findById(lineItem.productId);
          if (!product || product.isArchived) {
            requiresReview = true;
            reviewReasons.push(`Product ${lineItem.productId} is discontinued or missing.`);
            break;
          }
          if (product.currentStock < lineItem.quantity) {
            requiresReview = true;
            reviewReasons.push(
              `Insufficient stock for "${product.name}". Available: ${product.currentStock}, Queued: ${lineItem.quantity}`
            );
          }
        }

        if (requiresReview) {
          results.push({
            offlineSyncId: item.offlineSyncId,
            status: 'REQUIRES_MANUAL_REVIEW',
            message: 'Transaction cannot be auto-confirmed due to stock or catalog discrepancies.',
            details: reviewReasons
          });
          continue;
        }

        // 3. Process checkout
        item.checkoutData.offlineSyncId = item.offlineSyncId;
        const checkoutResult = await PosService.checkout(item.checkoutData, cashierId);

        results.push({
          offlineSyncId: item.offlineSyncId,
          status: 'CONFIRMED',
          receiptNumber: checkoutResult.receiptNumber,
          message: 'Offline transaction synchronized and confirmed successfully.'
        });
      } catch (err: any) {
        results.push({
          offlineSyncId: item.offlineSyncId,
          status: 'REJECTED',
          message: err.message
        });
      }
    }

    return results;
  }
}
