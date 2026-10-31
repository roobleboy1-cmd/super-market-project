import { Router } from 'express';
import { ReturnController } from '../controllers/return.controller';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createSaleReturnSchema } from '../validators/return.validator';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('sales:view'),
  ReturnController.getReturns
);
router.get(
  '/:id',
  authenticate,
  requirePermission('sales:view'),
  ReturnController.getReturnById
);
router.post(
  '/sales/:saleId',
  authenticate,
  requirePermission('sales:refund'),
  validate({ body: createSaleReturnSchema }),
  ReturnController.createSaleReturn
);

export default router;
