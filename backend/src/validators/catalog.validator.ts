import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name is required').trim(),
  sku: z.string().min(2, 'SKU is required').trim().toUpperCase(),
  barcode: z.string().min(3, 'Barcode is required').trim(),
  category: z.string().optional(),
  categoryId: z.string().optional(),
  brand: z.string().optional(),
  brandId: z.string().optional(),
  unit: z.string().optional(),
  defaultSupplier: z.string().optional(),
  supplierId: z.string().optional(),
  costPrice: z.number().min(0, 'Cost price must be non-negative'),
  sellingPrice: z.number().min(0, 'Selling price must be non-negative'),
  currentStock: z.number().min(0).optional(),
  quantity: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).default(5),
  minStockLevel: z.number().min(0).default(5),
  maxStockLevel: z.number().min(0).default(1000),
  isExpiringProduct: z.boolean().default(false),
  trackBatch: z.boolean().default(false),
  trackExpiry: z.boolean().optional(),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().optional()
});

export const updateProductSchema = createProductSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name is required').trim(),
  code: z.string().min(2, 'Code is required').trim().toUpperCase(),
  description: z.string().trim().optional(),
  isActive: z.boolean().default(true)
});

export const updateCategorySchema = createCategorySchema.partial();

export const createBrandSchema = z.object({
  name: z.string().min(2, 'Brand name is required').trim(),
  description: z.string().trim().optional(),
  isActive: z.boolean().default(true)
});

export const updateBrandSchema = createBrandSchema.partial();

export const createUnitSchema = z.object({
  name: z.string().min(1, 'Unit name is required').trim(),
  symbol: z.string().min(1, 'Symbol is required').trim(),
  precision: z.number().int().min(0).max(4).default(0),
  isActive: z.boolean().default(true)
});

export const updateUnitSchema = createUnitSchema.partial();

export const createSupplierSchema = z.object({
  name: z.string().min(2, 'Contact name is required').trim(),
  companyName: z.string().min(2, 'Company name is required').trim(),
  email: z.string().email().trim().optional().or(z.literal('')),
  phone: z.string().min(5, 'Phone number is required').trim(),
  address: z.string().trim().optional(),
  taxNumber: z.string().trim().optional(),
  paymentTerms: z.string().default('Net 30'),
  isActive: z.boolean().default(true)
});

export const updateSupplierSchema = createSupplierSchema.partial();
