import { z } from 'zod';

export const checkoutItemSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Valid product ID required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  discount: z.number().min(0).default(0)
});

export const checkoutPaymentSchema = z.object({
  method: z.enum(['CASH', 'CARD', 'EVC_PLUS', 'EDAHAB', 'ZAAD', 'BANK_TRANSFER']),
  amount: z.number().positive('Payment amount must be greater than zero'),
  reference: z.string().trim().optional()
});

export const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, 'Sale must contain at least one item'),
  payments: z.array(checkoutPaymentSchema).min(1, 'At least one payment method is required'),
  customerId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  shiftId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  couponCode: z.string().trim().optional(),
  redeemLoyaltyPoints: z.number().int().min(0).optional(),
  idempotencyKey: z.string().trim().min(8).optional(),
  notes: z.string().trim().optional()
});

export const voidSaleSchema = z.object({
  reason: z.string().min(3, 'A reason is required to void a sale').trim()
});

export const offlineReconcileItemSchema = z.object({
  offlineSyncId: z.string().min(1, 'offlineSyncId is required'),
  receiptNumber: z.string().optional(),
  checkoutData: checkoutSchema,
  queuedAt: z.string().datetime().optional()
});

export const offlineReconciliationSchema = z.object({
  batch: z.array(offlineReconcileItemSchema).min(1, 'Batch cannot be empty')
});
