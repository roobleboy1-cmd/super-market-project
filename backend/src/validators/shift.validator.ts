import { z } from 'zod';

export const openShiftSchema = z.object({
  openingCash: z.number().min(0, 'Opening cash must be non-negative')
});

export const cashMovementSchema = z.object({
  movementType: z.enum(['PAY_IN', 'PAY_OUT', 'DROP']),
  amount: z.number().positive('Movement amount must be greater than zero'),
  reason: z.string().min(3, 'Reason required for cash movement').trim()
});

export const closeShiftSchema = z.object({
  countedCash: z.number().min(0, 'Counted cash must be non-negative'),
  notes: z.string().trim().optional()
});

export const approveShiftSchema = z.object({
  notes: z.string().trim().optional()
});
