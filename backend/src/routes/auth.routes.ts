import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema
} from '../validators/auth.validator';

const router = Router();

router.post('/login', authLimiter, validate({ body: loginSchema }), AuthController.login);
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);
router.get('/csrf', AuthController.getCsrf);
router.post('/refresh', AuthController.refresh);
router.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), AuthController.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), AuthController.resetPassword);
router.patch('/change-password', authenticate, validate({ body: changePasswordSchema }), AuthController.changePassword);
router.patch('/profile', authenticate, validate({ body: updateProfileSchema }), AuthController.updateProfile);

export default router;
