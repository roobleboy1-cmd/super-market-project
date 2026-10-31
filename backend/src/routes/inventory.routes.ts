import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  stockAdjustmentSchema,
  createStockCountSchema,
  approveStockCountSchema
} from '../validators/inventory.validator';

const router = Router();

router.get(
  '/summary',
  authenticate,
  requirePermission('inventory:view'),
  InventoryController.getSummary
);

router.get(
  '/overview',
  authenticate,
  requirePermission('inventory:view'),
  InventoryController.getSummary
);
router.get(
  '/lots',
  authenticate,
  requirePermission('inventory:view'),
  InventoryController.getLots
);
router.get(
  '/low-stock',
  authenticate,
  requirePermission('inventory:view'),
  InventoryController.getLowStock
);
router.get(
  '/expiring',
  authenticate,
  requirePermission('inventory:view'),
  InventoryController.getExpiring
);
router.get(
  '/movements',
  authenticate,
  requirePermission('inventory:view'),
  InventoryController.getMovements
);
router.post(
  '/adjustments',
  authenticate,
  requirePermission('inventory:adjust'),
  validate({ body: stockAdjustmentSchema }),
  InventoryController.adjustStock
);

/* Physical Inventory Counts */
router.get(
  '/counts',
  authenticate,
  requirePermission('inventory:count'),
  InventoryController.getCounts
);
router.post(
  '/counts',
  authenticate,
  requirePermission('inventory:count'),
  validate({ body: createStockCountSchema }),
  InventoryController.createCount
);
router.get(
  '/counts/:id',
  authenticate,
  requirePermission('inventory:count'),
  InventoryController.getCountById
);
router.post(
  '/counts/:id/submit',
  authenticate,
  requirePermission('inventory:count'),
  InventoryController.submitCount
);
router.post(
  '/counts/:id/approve',
  authenticate,
  requirePermission('inventory:approve_count'),
  validate({ body: approveStockCountSchema }),
  InventoryController.approveCount
);

export default router;
