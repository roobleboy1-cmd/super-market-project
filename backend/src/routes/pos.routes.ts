import { Router } from 'express';
import { PosController } from '../controllers/pos.controller';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  checkoutSchema,
  voidSaleSchema,
  offlineReconciliationSchema
} from '../validators/sale.validator';

const router = Router();

router.get(
  '/sales',
  authenticate,
  requirePermission('sales:view'),
  PosController.getSales
);
router.get(
  '/sales/:id',
  authenticate,
  requirePermission('sales:view'),
  PosController.getSaleById
);
router.post(
  '/sales/checkout',
  authenticate,
  requirePermission('sales:checkout'),
  validate({ body: checkoutSchema }),
  PosController.checkout
);
router.post(
  '/sales/:id/void',
  authenticate,
  requirePermission('sales:void'),
  validate({ body: voidSaleSchema }),
  PosController.voidSale
);
router.get(
  '/sales/:id/receipt',
  authenticate,
  requirePermission('sales:view'),
  PosController.getReceipt
);
router.post(
  '/sales/reconcile-offline',
  authenticate,
  requirePermission('sales:checkout'),
  validate({ body: offlineReconciliationSchema }),
  PosController.reconcileOffline
);

export default router;
