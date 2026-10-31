import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();

/* ================= DASHBOARD ================= */
router.get(
  '/dashboard/stats',
  authenticate,
  requirePermission('reports:sales'),
  ReportController.getDashboardStats
);
router.get(
  '/dashboard/sales-chart',
  authenticate,
  requirePermission('reports:sales'),
  ReportController.getSalesChart
);
router.get(
  '/dashboard/recent-sales',
  authenticate,
  requirePermission('reports:sales'),
  ReportController.getRecentSales
);
router.get(
  '/dashboard/top-products',
  authenticate,
  requirePermission('reports:sales'),
  ReportController.getTopProducts
);
router.get(
  '/dashboard/alerts',
  authenticate,
  requirePermission('reports:inventory'),
  ReportController.getDashboardAlerts
);

/* ================= DETAILED REPORTS ================= */
router.get(
  '/reports/sales',
  authenticate,
  requirePermission('reports:sales'),
  ReportController.getSalesReport
);
router.get(
  '/reports/profit',
  authenticate,
  requirePermission('reports:financial'),
  ReportController.getProfitReport
);

router.get(
  '/reports/financial',
  authenticate,
  requirePermission('reports:financial'),
  ReportController.getProfitReport
);
router.get(
  '/reports/cash-reconciliation',
  authenticate,
  requirePermission('reports:financial'),
  ReportController.getCashReconciliationReport
);

export default router;
