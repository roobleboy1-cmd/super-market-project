import { z } from 'zod';

export const updateStoreSettingsSchema = z.object({
  supermarketName: z.string().min(2).trim().optional(),
  logoUrl: z.string().trim().optional(),
  address: z
    .object({
      street: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      country: z.string().trim().optional(),
      postalCode: z.string().trim().optional()
    })
    .optional(),
  contact: z
    .object({
      phone: z.string().trim().optional(),
      email: z.string().email().trim().optional(),
      website: z.string().trim().optional()
    })
    .optional(),
  taxNumber: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
  currency: z.string().trim().optional(),
  currencySymbol: z.string().trim().optional(),
  defaultTaxRate: z.number().min(0).max(100).optional(),
  receiptConfig: z
    .object({
      headerText: z.string().optional(),
      footerText: z.string().optional(),
      showTaxNumber: z.boolean().optional(),
      showCashierName: z.boolean().optional(),
      showBarcode: z.boolean().optional()
    })
    .optional(),
  paymentMethodsConfig: z
    .array(
      z.object({
        code: z.string().trim(),
        label: z.string().trim(),
        isEnabled: z.boolean(),
        requiresReference: z.boolean()
      })
    )
    .optional(),
  stockThresholds: z
    .object({
      defaultLowStockAlert: z.number().min(0).optional(),
      expiryAlertDays: z.number().min(1).optional()
    })
    .optional(),
  loyaltyConfig: z
    .object({
      isEnabled: z.boolean().optional(),
      pointsPerDollar: z.number().min(0).optional(),
      redemptionRate: z.number().min(0).optional()
    })
    .optional()
});
