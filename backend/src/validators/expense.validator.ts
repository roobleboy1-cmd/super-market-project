import { z } from 'zod';

export const createExpenseSchema = z.object({
  category: z.string().min(2, 'Category is required').trim(),
  description: z.string().min(3, 'Description is required').trim(),
  amount: z.number().positive('Expense amount must be greater than zero'),
  paymentMethod: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const normalized = val.trim().toUpperCase().replace(/\s+/g, '_');
        if (['CASH', 'CARD', 'EVC_PLUS', 'EDAHAB', 'ZAAD', 'BANK_TRANSFER'].includes(normalized)) {
          return normalized;
        }
      }
      return val;
    },
    z.enum(['CASH', 'CARD', 'EVC_PLUS', 'EDAHAB', 'ZAAD', 'BANK_TRANSFER']).default('CASH')
  ),
  paidTo: z.string().min(2, 'Paid to is required').trim(),
  paidDate: z.string().optional(),
  receiptUrl: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

export const updateExpenseSchema = createExpenseSchema.partial();
