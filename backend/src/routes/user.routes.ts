import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema
} from '../validators/user.validator';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('users:manage'),
  UserController.getUsers
);
router.post(
  '/',
  authenticate,
  requirePermission('users:manage'),
  validate({ body: createUserSchema }),
  UserController.createUser
);
router.get(
  '/:id',
  authenticate,
  requirePermission('users:manage'),
  UserController.getUserById
);
router.patch(
  '/:id',
  authenticate,
  requirePermission('users:manage'),
  validate({ body: updateUserSchema }),
  UserController.updateUser
);
router.patch(
  '/:id/status',
  authenticate,
  requirePermission('users:manage'),
  validate({ body: updateUserStatusSchema }),
  UserController.updateUserStatus
);

export default router;
