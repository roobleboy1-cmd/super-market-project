import mongoose from 'mongoose';
import { Customer, ICustomer } from '../models/Customer';
import { Sale } from '../models/Sale';
import { LoyaltyTransaction } from '../models/LoyaltyTransaction';
import { Coupon } from '../models/Coupon';
import { Promotion } from '../models/Promotion';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';
import { AuditService } from './audit.service';

export class CustomerService {
  static async getCustomers(query: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { isActive: true };
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { phone: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } }
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Customer.countDocuments(filter)
    ]);

    return {
      customers,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static async getCustomerById(id: string) {
    const customer = await Customer.findById(id);
    if (!customer) throw new NotFoundError('Customer not found');
    return customer;
  }

  static async createCustomer(data: Partial<ICustomer>, userId?: string) {
    const existing = await Customer.findOne({ phone: data.phone });
    if (existing) {
      throw new ConflictError(`Customer with phone '${data.phone}' already exists.`);
    }

    const customer = await Customer.create(data);

    if (userId) {
      await AuditService.log({
        actorId: userId,
        action: 'CUSTOMER_CREATED',
        entity: 'Customer',
        entityId: (customer._id as any).toString(),
        changes: data
      });
    }

    return customer;
  }

  static async updateCustomer(id: string, data: Partial<ICustomer>, userId?: string) {
    if (data.phone) {
      const existing = await Customer.findOne({ phone: data.phone, _id: { $ne: id } });
      if (existing) {
        throw new ConflictError(`Another customer with phone '${data.phone}' already exists.`);
      }
    }

    const customer = await Customer.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!customer) throw new NotFoundError('Customer not found');

    if (userId) {
      await AuditService.log({
        actorId: userId,
        action: 'CUSTOMER_UPDATED',
        entity: 'Customer',
        entityId: id,
        changes: data
      });
    }

    return customer;
  }

  static async getCustomerPurchases(customerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [sales, total] = await Promise.all([
      Sale.find({ customerId: new mongoose.Types.ObjectId(customerId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Sale.countDocuments({ customerId: new mongoose.Types.ObjectId(customerId) })
    ]);

    return {
      sales,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static async getCustomerLoyaltyHistory(customerId: string) {
    const customer = await Customer.findById(customerId);
    if (!customer) throw new NotFoundError('Customer not found');

    const history = await LoyaltyTransaction.find({ customerId: new mongoose.Types.ObjectId(customerId) })
      .sort({ createdAt: -1 })
      .lean();

    return {
      currentPoints: customer.loyaltyPoints,
      history
    };
  }

  static async adjustLoyaltyPoints(
    customerId: string,
    points: number,
    reason: string,
    performedBy: string
  ) {
    const customer = await Customer.findById(customerId);
    if (!customer) throw new NotFoundError('Customer not found');

    const newPoints = customer.loyaltyPoints + points;
    if (newPoints < 0) {
      throw new ValidationError(`Cannot deduct ${Math.abs(points)} points. Customer only has ${customer.loyaltyPoints}.`);
    }

    customer.loyaltyPoints = newPoints;
    await customer.save();

    const transaction = await LoyaltyTransaction.create({
      customerId: customer._id,
      type: 'ADJUSTED',
      points,
      monetaryEquivalent: Number((points * 0.01).toFixed(2)),
      balanceAfter: newPoints,
      reason,
      performedBy: new mongoose.Types.ObjectId(performedBy)
    });

    await AuditService.log({
      actorId: performedBy,
      action: 'LOYALTY_POINTS_ADJUSTED',
      entity: 'Customer',
      entityId: customerId,
      changes: { points, newPoints, reason }
    });

    return { customer, transaction };
  }

  static async validateCoupon(code: string, subtotal: number, customerId?: string) {
    const coupon = await Coupon.findOne({
      code: code.toUpperCase().trim(),
      isActive: true,
      expiryDate: { $gt: new Date() }
    });

    if (!coupon) {
      throw new ValidationError('Invalid or expired coupon code.');
    }

    if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) {
      throw new ValidationError('Coupon redemption limit has been reached.');
    }

    if (coupon.customerId && customerId && coupon.customerId.toString() !== customerId) {
      throw new ValidationError('This coupon is not valid for the selected customer.');
    }

    if (subtotal < coupon.minOrderValue) {
      throw new ValidationError(
        `Minimum order amount of $${coupon.minOrderValue} required to apply this coupon.`
      );
    }

    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    return {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      calculatedDiscount: Number(discount.toFixed(2)),
      minOrderValue: coupon.minOrderValue
    };
  }
}
