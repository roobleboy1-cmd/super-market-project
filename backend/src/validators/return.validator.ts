import { z } from 'zod';

export const createSaleReturnSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Valid product ID required'),
        quantity: z.number().positive('Quantity must be greater than zero'),
        condition: z.enum(['resellable', 'damaged', 'expired']),
        disposition: z.enum(['restocked', 'quarantined', 'disposed']),
        returnReason: z.string().min(3, 'Return reason required').trim()
      })
    )
    .min(1, 'At least one item must be returned'),
  refundMethod: z.enum(['CASH', 'CARD', 'EVC_PLUS', 'EDAHAB', 'ZAAD', 'BANK_TRANSFER']).default('CASH'),
  notes: z.string().trim().optional()
});
