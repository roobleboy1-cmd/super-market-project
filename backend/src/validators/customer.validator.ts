import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Customer name is required').trim(),
  phone: z.string().min(5, 'Valid phone number is required').trim(),
  email: z.string().email().trim().optional().or(z.literal('')),
  address: z.string().trim().optional()
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const adjustLoyaltyPointsSchema = z.object({
  points: z.number().int().refine((p) => p !== 0, 'Points adjustment cannot be zero'),
  reason: z.string().min(3, 'Reason is required').trim()
});
