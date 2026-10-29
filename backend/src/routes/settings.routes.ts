import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateStoreSettingsSchema } from '../validators/settings.validator';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('settings:view'),
  SettingsController.getSettings
);
router.patch(
  '/',
  authenticate,
  requirePermission('settings:update'),
  validate({ body: updateStoreSettingsSchema }),
  SettingsController.updateSettings
);

export default router;
