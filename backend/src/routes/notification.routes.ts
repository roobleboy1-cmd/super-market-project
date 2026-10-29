import { Router, Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { authenticate } from '../middleware/auth';
import { Send } from '../utils/apiResponse';
import { paramStr } from '../utils/params';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await NotificationService.getNotificationsForUser({
      id: req.user!.id,
      role: req.user!.role
    });
    Send.success(res, notifications);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await NotificationService.markAsRead(paramStr(req.params.id), req.user!.id);
    Send.success(res, updated);
  } catch (error) {
    next(error);
  }
});

router.post('/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await NotificationService.markAllAsRead(req.user!.id, req.user!.role);
    Send.success(res, { message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

export default router;
