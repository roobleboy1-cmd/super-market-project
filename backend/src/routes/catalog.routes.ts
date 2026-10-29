import { Router } from 'express';
import { CatalogController } from '../controllers/catalog.controller';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  updateCategorySchema,
  createBrandSchema,
  updateBrandSchema,
  createUnitSchema,
  updateUnitSchema,
  createSupplierSchema,
  updateSupplierSchema
} from '../validators/catalog.validator';

const router = Router();

/* ================= PRODUCTS ================= */
router.get(
  '/products',
  authenticate,
  requirePermission('products:view'),
  CatalogController.getProducts
);
router.get(
  '/products/export',
  authenticate,
  requirePermission('products:import_export'),
  CatalogController.exportProducts
);
router.get(
  '/products/:id',
  authenticate,
  requirePermission('products:view'),
  CatalogController.getProductById
);
router.post(
  '/products',
  authenticate,
  requirePermission('products:create'),
  validate({ body: createProductSchema }),
  CatalogController.createProduct
);
router.patch(
  '/products/:id',
  authenticate,
  requirePermission('products:update'),
  validate({ body: updateProductSchema }),
  CatalogController.updateProduct
);
router.delete(
  '/products/:id',
  authenticate,
  requirePermission('products:delete'),
  CatalogController.deleteProduct
);
router.post(
  '/products/import',
  authenticate,
  requirePermission('products:import_export'),
  CatalogController.importProducts
);
router.get(
  '/products/:id/barcode-label',
  authenticate,
  requirePermission('products:view'),
  CatalogController.getBarcodeLabel
);

/* ================= CATEGORIES ================= */
router.get(
  '/categories',
  authenticate,
  requirePermission('products:view'),
  CatalogController.getCategories
);
router.post(
  '/categories',
  authenticate,
  requirePermission('products:create'),
  validate({ body: createCategorySchema }),
  CatalogController.createCategory
);
router.patch(
  '/categories/:id',
  authenticate,
  requirePermission('products:update'),
  validate({ body: updateCategorySchema }),
  CatalogController.updateCategory
);
router.delete(
  '/categories/:id',
  authenticate,
  requirePermission('products:delete'),
  CatalogController.deleteCategory
);

/* ================= BRANDS ================= */
router.get(
  '/brands',
  authenticate,
  requirePermission('products:view'),
  CatalogController.getBrands
);
router.post(
  '/brands',
  authenticate,
  requirePermission('products:create'),
  validate({ body: createBrandSchema }),
  CatalogController.createBrand
);
router.patch(
  '/brands/:id',
  authenticate,
  requirePermission('products:update'),
  validate({ body: updateBrandSchema }),
  CatalogController.updateBrand
);
router.delete(
  '/brands/:id',
  authenticate,
  requirePermission('products:delete'),
  CatalogController.deleteBrand
);

/* ================= UNITS ================= */
router.get(
  '/units',
  authenticate,
  requirePermission('products:view'),
  CatalogController.getUnits
);
router.post(
  '/units',
  authenticate,
  requirePermission('products:create'),
  validate({ body: createUnitSchema }),
  CatalogController.createUnit
);
router.patch(
  '/units/:id',
  authenticate,
  requirePermission('products:update'),
  validate({ body: updateUnitSchema }),
  CatalogController.updateUnit
);
router.delete(
  '/units/:id',
  authenticate,
  requirePermission('products:delete'),
  CatalogController.deleteUnit
);

/* ================= SUPPLIERS ================= */
router.get(
  '/suppliers',
  authenticate,
  requirePermission('suppliers:manage'),
  CatalogController.getSuppliers
);
router.post(
  '/suppliers',
  authenticate,
  requirePermission('suppliers:manage'),
  validate({ body: createSupplierSchema }),
  CatalogController.createSupplier
);
router.patch(
  '/suppliers/:id',
  authenticate,
  requirePermission('suppliers:manage'),
  validate({ body: updateSupplierSchema }),
  CatalogController.updateSupplier
);
router.delete(
  '/suppliers/:id',
  authenticate,
  requirePermission('suppliers:manage'),
  CatalogController.deleteSupplier
);

export default router;
