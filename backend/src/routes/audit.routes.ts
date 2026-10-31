import { Router, Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';
import { authenticate, requirePermission } from '../middleware/auth';
import { Send } from '../utils/apiResponse';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('reports:audit'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await AuditService.getLogs(req.query as any);
      Send.success(res, result.logs, result.meta);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
