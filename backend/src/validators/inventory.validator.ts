import { z } from 'zod';

export const stockAdjustmentSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Valid product ID required'),
  lotId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Valid lot ID required').optional(),
  quantity: z.number().refine((val) => val !== 0, 'Adjustment quantity cannot be 0'),
  reason: z.enum([
    'DAMAGE',
    'THEFT_OR_LOSS',
    'EXPIRATION_DISPOSAL',
    'INTERNAL_USE',
    'INVENTORY_CORRECTION',
    'OTHER'
  ]),
  notes: z.string().trim().optional()
});

export const createStockCountSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Valid product ID required'),
        countedStock: z.number().min(0, 'Counted stock must be non-negative')
      })
    )
    .min(1, 'At least one item must be counted'),
  notes: z.string().trim().optional()
});

export const approveStockCountSchema = z.object({
  notes: z.string().trim().optional()
});
