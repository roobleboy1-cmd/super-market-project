import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createCustomerSchema,
  updateCustomerSchema,
  adjustLoyaltyPointsSchema
} from '../validators/customer.validator';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('customers:view'),
  CustomerController.getCustomers
);
router.post(
  '/',
  authenticate,
  requirePermission('customers:manage'),
  validate({ body: createCustomerSchema }),
  CustomerController.createCustomer
);
router.get(
  '/:id',
  authenticate,
  requirePermission('customers:view'),
  CustomerController.getCustomerById
);
router.patch(
  '/:id',
  authenticate,
  requirePermission('customers:manage'),
  validate({ body: updateCustomerSchema }),
  CustomerController.updateCustomer
);
router.get(
  '/:id/purchases',
  authenticate,
  requirePermission('customers:view'),
  CustomerController.getCustomerPurchases
);
router.get(
  '/:id/loyalty',
  authenticate,
  requirePermission('customers:view'),
  CustomerController.getCustomerLoyalty
);
router.post(
  '/:id/loyalty-adjust',
  authenticate,
  requirePermission('loyalty:manage'),
  validate({ body: adjustLoyaltyPointsSchema }),
  CustomerController.adjustLoyaltyPoints
);
router.post(
  '/validate-coupon',
  authenticate,
  requirePermission('sales:checkout'),
  CustomerController.validateCoupon
);

export default router;
