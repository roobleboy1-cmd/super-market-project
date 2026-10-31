import { Router } from 'express';
import { ShiftController } from '../controllers/shift.controller';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  openShiftSchema,
  cashMovementSchema,
  closeShiftSchema,
  approveShiftSchema
} from '../validators/shift.validator';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('shifts:open'),
  ShiftController.getShifts
);
router.post(
  '/open',
  authenticate,
  requirePermission('shifts:open'),
  validate({ body: openShiftSchema }),
  ShiftController.openShift
);
router.get(
  '/:id',
  authenticate,
  requirePermission('shifts:open'),
  ShiftController.getShiftById
);
router.post(
  '/:id/cash-movements',
  authenticate,
  requirePermission('shifts:move_cash'),
  validate({ body: cashMovementSchema }),
  ShiftController.recordCashMovement
);
router.post(
  '/:id/close',
  authenticate,
  requirePermission('shifts:close'),
  validate({ body: closeShiftSchema }),
  ShiftController.closeShift
);
router.post(
  '/:id/approve-close',
  authenticate,
  requirePermission('shifts:approve'),
  validate({ body: approveShiftSchema }),
  ShiftController.approveClose
);

export default router;
