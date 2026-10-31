import * as React from 'react';
import { lazy } from 'react';
import { createBrowserRouter, Navigate, useRouteError, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';

// Lazy-loaded pages (auth & main modules)
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { PosPage } from '@/pages/pos/PosPage';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { CategoriesBrandsPage } from '@/pages/categories/CategoriesBrandsPage';
import { InventoryPage } from '@/pages/inventory/InventoryPage';
import { BatchesExpiryPage } from '@/pages/batches/BatchesExpiryPage';
import { StockCountsPage } from '@/pages/stock-adjustments/StockCountsPage';
import { SuppliersPage } from '@/pages/suppliers/SuppliersPage';
import { PurchaseOrdersPage } from '@/pages/purchases/PurchaseOrdersPage';
import { SalesHistoryPage } from '@/pages/sales/SalesHistoryPage';
import { ReturnsRefundsPage } from '@/pages/returns/ReturnsRefundsPage';
import { CustomersLoyaltyPage } from '@/pages/customers/CustomersLoyaltyPage';
import { CashierShiftsPage } from '@/pages/shifts/CashierShiftsPage';
import { ExpensesPage } from '@/pages/expenses/ExpensesPage';
import { EmployeesPage } from '@/pages/employees/EmployeesPage';
import { PromotionsCouponsPage } from '@/pages/promotions/PromotionsCouponsPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { ActivityLogsPage } from '@/pages/activity/ActivityLogsPage';
import { StoreSettingsPage } from '@/pages/settings/StoreSettingsPage';

// New DB viewer page
const DatabaseViewerPage = lazy(() => import('@/pages/dbViewer/DatabaseViewerPage'));

function RouteErrorBoundary() {
  const error: any = useRouteError();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
          !
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Waxaa dhacay khalad yar
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {error?.message || 'Boggan kuma guulaysan inuu si caadi ah u furmo.'}
        </p>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate(0)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
          >
            Dib u cusboonaysii (Reload)
          </button>
        </div>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  // Public Auth Routes
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorBoundary /> },
  { path: '/forgot-password', element: <ForgotPasswordPage />, errorElement: <RouteErrorBoundary /> },
  { path: '/reset-password', element: <ResetPasswordPage />, errorElement: <RouteErrorBoundary /> },

  // Protected Application Shell (All modules)
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <DashboardPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'pos', element: <PosPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'products', element: <ProductsPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'categories', element: <CategoriesBrandsPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'inventory', element: <InventoryPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'batches', element: <BatchesExpiryPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'stock-counts', element: <StockCountsPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'suppliers', element: <SuppliersPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'purchases', element: <PurchaseOrdersPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'sales', element: <SalesHistoryPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'returns', element: <ReturnsRefundsPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'customers', element: <CustomersLoyaltyPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'shifts', element: <CashierShiftsPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'expenses', element: <ExpensesPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'employees', element: <EmployeesPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'promotions', element: <PromotionsCouponsPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'reports', element: <ReportsPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'notifications', element: <NotificationsPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'activity-logs', element: <ActivityLogsPage />, errorElement: <RouteErrorBoundary /> },
      { path: 'settings', element: <StoreSettingsPage />, errorElement: <RouteErrorBoundary /> },
      // DB viewer route
      { path: 'db-viewer', element: <DatabaseViewerPage />, errorElement: <RouteErrorBoundary /> },
    ],
  },
  // Fallback
  { path: '*', element: <Navigate to="/" replace /> },
]);
