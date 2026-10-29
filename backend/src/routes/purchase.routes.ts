import { Router } from 'express';
import { PurchaseController } from '../controllers/purchase.controller';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createPurchaseSchema,
  receivePurchaseSchema,
  cancelPurchaseSchema
} from '../validators/purchase.validator';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('purchases:view'),
  PurchaseController.getPurchases
);
router.post(
  '/',
  authenticate,
  requirePermission('purchases:create'),
  validate({ body: createPurchaseSchema }),
  PurchaseController.createPurchase
);
router.get(
  '/:id',
  authenticate,
  requirePermission('purchases:view'),
  PurchaseController.getPurchaseById
);
router.patch(
  '/:id/approve',
  authenticate,
  requirePermission('purchases:create'),
  PurchaseController.approvePurchase
);
router.post(
  '/:id/receive',
  authenticate,
  requirePermission('purchases:receive'),
  validate({ body: receivePurchaseSchema }),
  PurchaseController.receiveGoods
);
router.post(
  '/:id/cancel',
  authenticate,
  requirePermission('purchases:cancel'),
  validate({ body: cancelPurchaseSchema }),
  PurchaseController.cancelPurchase
);

export default router;
