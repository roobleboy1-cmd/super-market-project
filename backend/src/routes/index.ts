import { Router } from 'express';
import authRoutes from './auth.routes';
import catalogRoutes from './catalog.routes';
import inventoryRoutes from './inventory.routes';
import posRoutes from './pos.routes';
import purchaseRoutes from './purchase.routes';
import returnRoutes from './return.routes';
import shiftRoutes from './shift.routes';
import customerRoutes from './customer.routes';
import expenseRoutes from './expense.routes';
import settingsRoutes from './settings.routes';
import reportRoutes from './report.routes';
import userRoutes from './user.routes';
import notificationRoutes from './notification.routes';
import auditRoutes from './audit.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/', catalogRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/', posRoutes);
apiRouter.use('/purchases', purchaseRoutes);
apiRouter.use('/returns', returnRoutes);
apiRouter.use('/cash-shifts', shiftRoutes);
apiRouter.use('/shifts', shiftRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/expenses', expenseRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/', reportRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/employees', userRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/audit-logs', auditRoutes);

export default apiRouter;
