import mongoose from 'mongoose';
import { SaleReturn, ISaleReturn, ISaleReturnItem } from '../models/SaleReturn';
import { Sale } from '../models/Sale';
import { Product } from '../models/Product';
import { Payment } from '../models/Payment';
import { StockMovement } from '../models/StockMovement';
import { InventoryLot } from '../models/InventoryLot';
import { generateReceiptNumber } from '../utils/crypto';
import { withTransaction } from '../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { AuditService } from './audit.service';
import { PaymentMethodType } from '../types/common';

export class ReturnService {
  static async getReturns(query: { page?: number; limit?: number }) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [returns, total] = await Promise.all([
      SaleReturn.find()
        .populate('cashierId', 'name email')
        .populate('originalSaleId', 'receiptNumber grandTotal')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SaleReturn.countDocuments()
    ]);

    return {
      returns,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static async getReturnById(id: string) {
    const ret = await SaleReturn.findById(id)
      .populate('cashierId', 'name email')
      .populate('originalSaleId')
      .populate('approvedBy', 'name email');
    if (!ret) throw new NotFoundError('Return record not found');
    return ret;
  }

  /**
   * Process customer sale return with product inspection and disposition handling
   */
  static async processSaleReturn(
    saleId: string,
    itemsToReturn: Array<{
      productId: string;
      quantity: number;
      condition: 'resellable' | 'damaged' | 'expired';
      disposition: 'restocked' | 'quarantined' | 'disposed';
      returnReason: string;
    }>,
    refundMethod: PaymentMethodType,
    cashierId: string,
    notes?: string
  ) {
    return await withTransaction(async (session) => {
      const sale = await Sale.findById(saleId).session(session || null);
      if (!sale) throw new NotFoundError('Original sale not found');

      if (sale.status === 'voided') {
        throw new ConflictError('Cannot process returns against a voided sale.');
      }

      // Check existing returns for this sale to ensure returnable quantity limit
      const existingReturns = await SaleReturn.find({ originalSaleId: sale._id }).session(session || null);
      const previouslyReturnedMap = new Map<string, number>();

      for (const exRet of existingReturns) {
        for (const item of exRet.items) {
          const pid = (item.productId as any).toString();
          previouslyReturnedMap.set(pid, (previouslyReturnedMap.get(pid) || 0) + item.quantity);
        }
      }

      let totalRefundAmount = 0;
      const verifiedReturnItems: ISaleReturnItem[] = [];

      for (const reqItem of itemsToReturn) {
        const saleItem = sale.items.find(
          (item) => (item.productId as any).toString() === reqItem.productId
        );

        if (!saleItem) {
          throw new ValidationError(`Product ${reqItem.productId} was not purchased in this sale.`);
        }

        const previouslyReturned = previouslyReturnedMap.get(reqItem.productId) || 0;
        const availableToReturn = saleItem.quantity - previouslyReturned;

        if (reqItem.quantity > availableToReturn) {
          throw new ValidationError(
            `Cannot return ${reqItem.quantity} units of "${saleItem.productName}". Max returnable: ${availableToReturn}`
          );
        }

        const itemRefund = Number((saleItem.unitPrice * reqItem.quantity).toFixed(2));
        totalRefundAmount += itemRefund;

        verifiedReturnItems.push({
          productId: saleItem.productId,
          productName: saleItem.productName,
          quantity: reqItem.quantity,
          unitPrice: saleItem.unitPrice,
          refundAmount: itemRefund,
          condition: reqItem.condition,
          disposition: reqItem.disposition,
          returnReason: reqItem.returnReason
        });

        // Handle inventory disposition: only 'restocked' adds units back to available stock
        const product = await Product.findById(reqItem.productId).session(session || null);
        if (product) {
          if (reqItem.disposition === 'restocked') {
            const previousStock = product.currentStock;
            product.currentStock += reqItem.quantity;
            await product.save({ session: session || null });

            await StockMovement.create(
              [
                {
                  productId: product._id,
                  movementType: 'SALE_RETURN',
                  quantity: reqItem.quantity,
                  previousStock,
                  newStock: product.currentStock,
                  unitCost: saleItem.costPrice,
                  referenceType: 'SaleReturn',
                  reason: `Customer return restocked: ${reqItem.returnReason}`,
                  performedBy: new mongoose.Types.ObjectId(cashierId)
                }
              ],
              { session: session || null }
            );
          } else if (reqItem.disposition === 'quarantined') {
            // Put in quarantine lot so it is not sellable
            await InventoryLot.create(
              [
                {
                  productId: product._id,
                  batchNumber: `RETURN-QUARANTINE-${Date.now().toString().slice(-6)}`,
                  quantityReceived: reqItem.quantity,
                  remainingQuantity: reqItem.quantity,
                  unitCost: saleItem.costPrice,
                  status: 'quarantined',
                  notes: `Customer return (${reqItem.condition}): ${reqItem.returnReason}`
                }
              ],
              { session: session || null }
            );
          }
        }
      }

      totalRefundAmount = Number(totalRefundAmount.toFixed(2));
      const returnNumber = generateReceiptNumber('RET');

      const saleReturn = new SaleReturn({
        returnNumber,
        originalSaleId: sale._id,
        receiptNumber: sale.receiptNumber,
        cashierId: new mongoose.Types.ObjectId(cashierId),
        items: verifiedReturnItems,
        totalRefundAmount,
        refundMethod,
        status: 'completed',
        notes
      });

      await saleReturn.save({ session: session || null });

      // Create Payment refund record
      await Payment.create(
        [
          {
            paymentNumber: generateReceiptNumber('PAY-REF'),
            transactionType: 'SALE_RETURN',
            referenceId: saleReturn._id,
            amount: totalRefundAmount,
            method: refundMethod,
            status: 'completed',
            processedBy: new mongoose.Types.ObjectId(cashierId),
            notes: `Refund for return ${returnNumber}`
          }
        ],
        { session: session || null }
      );

      // Check if original sale is now fully refunded
      const totalReturnedNow = (existingReturns.reduce((sum, r) => sum + r.totalRefundAmount, 0) + totalRefundAmount);
      if (totalReturnedNow >= sale.grandTotal) {
        sale.status = 'refunded';
        sale.paymentStatus = 'refunded';
        await sale.save({ session: session || null });
      }

      await AuditService.log({
        actorId: cashierId,
        action: 'SALE_RETURN_PROCESSED',
        entity: 'SaleReturn',
        entityId: (saleReturn._id as any).toString(),
        changes: { returnNumber, totalRefundAmount, receiptNumber: sale.receiptNumber }
      });

      return saleReturn;
    });
  }
}
