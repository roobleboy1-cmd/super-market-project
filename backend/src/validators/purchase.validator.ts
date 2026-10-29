import { z } from 'zod';

export const createPurchaseSchema = z.object({
  supplierId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Valid supplier ID required'),
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Valid product ID required'),
        orderedQuantity: z.number().positive('Ordered quantity must be greater than zero'),
        unitCost: z.number().min(0, 'Unit cost must be non-negative'),
        taxRate: z.number().min(0).default(0)
      })
    )
    .min(1, 'Purchase must have at least one line item'),
  expectedDeliveryDate: z.string().datetime().optional(),
  notes: z.string().trim().optional()
});

export const receivePurchaseSchema = z.object({
  receivedItems: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Valid product ID required'),
        receivedQuantity: z.number().min(0, 'Received quantity cannot be negative'),
        batchNumber: z.string().trim().optional(),
        expirationDate: z.string().optional()
      })
    )
    .min(1, 'At least one item must be received'),
  notes: z.string().trim().optional()
});

export const cancelPurchaseSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason is required').trim()
});
