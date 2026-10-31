import {
  INITIAL_SETTINGS,
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_BRANDS,
  INITIAL_SUPPLIERS,
  INITIAL_PRODUCTS,
  INITIAL_BATCHES,
  INITIAL_CUSTOMERS,
  INITIAL_CURRENT_SHIFT,
  INITIAL_SALES,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_RETURNS,
  INITIAL_EXPENSES,
  INITIAL_PROMOTIONS,
  INITIAL_COUPONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
} from './mockData'

import type {
  Product,
  Category,
  Brand,
  Supplier,
  PurchaseOrder,
  Sale,
  SalesReturn,
  Customer,
  CashierShift,
  Expense,
  User,
  Promotion,
  Coupon,
  NotificationItem,
  AuditLog,
  StoreSettings,
  BatchLot,
  StockAdjustment,
  PhysicalCount,
  StockMovement,
} from '@/types'

class LocalDataStore {
  settings: StoreSettings = { ...INITIAL_SETTINGS }
  users: User[] = [...INITIAL_USERS]
  categories: Category[] = [...INITIAL_CATEGORIES]
  brands: Brand[] = [...INITIAL_BRANDS]
  suppliers: Supplier[] = [...INITIAL_SUPPLIERS]
  products: Product[] = [...INITIAL_PRODUCTS]
  batches: BatchLot[] = [...INITIAL_BATCHES]
  customers: Customer[] = [...INITIAL_CUSTOMERS]
  currentShift: CashierShift | null = null
  shiftHistory: CashierShift[] = []
  sales: Sale[] = [...INITIAL_SALES]
  purchaseOrders: PurchaseOrder[] = [...INITIAL_PURCHASE_ORDERS]
  returns: SalesReturn[] = [...INITIAL_RETURNS]
  expenses: Expense[] = [...INITIAL_EXPENSES]
  promotions: Promotion[] = [...INITIAL_PROMOTIONS]
  coupons: Coupon[] = [...INITIAL_COUPONS]
  notifications: NotificationItem[] = [...INITIAL_NOTIFICATIONS]
  auditLogs: AuditLog[] = [...INITIAL_AUDIT_LOGS]
  stockAdjustments: StockAdjustment[] = []
  stockMovements: StockMovement[] = [
    {
      id: 'sm-1',
      productId: 'prod-1',
      productName: 'Almarai Fresh Milk 1L',
      type: 'sale',
      quantityChange: -2,
      previousQty: 47,
      newQty: 45,
      referenceNo: 'INV-2026-00901',
      performedBy: 'Hassan Ali Mire',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'sm-2',
      productId: 'prod-7',
      productName: 'Fresh Bananas (1kg)',
      type: 'purchase',
      quantityChange: 150,
      previousQty: 20,
      newQty: 170,
      referenceNo: 'PO-2026-00102',
      performedBy: 'Khadija Osman',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ]
  physicalCounts: PhysicalCount[] = [
    {
      id: 'cnt-1',
      countReference: 'AUD-2026-OCT-1',
      status: 'completed',
      totalItems: 12,
      discrepancyCount: 2,
      totalVarianceValue: -4.5,
      countedBy: 'Khadija Osman (Inventory Mgr)',
      notes: 'Monthly regular inventory audit for dairy and produce aisles',
      items: [
        {
          productId: 'prod-1',
          productName: 'Almarai Fresh Milk 1L',
          sku: 'ALM-MILK-1L',
          expectedQty: 45,
          countedQty: 45,
          variance: 0,
          unitCost: 1.1,
          varianceValue: 0,
        },
        {
          productId: 'prod-4',
          productName: 'Sunflower Cooking Oil 3L',
          sku: 'HSSN-OIL-3L',
          expectedQty: 9,
          countedQty: 8,
          variance: -1,
          unitCost: 4.8,
          varianceValue: -4.8,
        },
      ],
      createdAt: '2026-10-20T08:00:00Z',
      completedAt: '2026-10-20T11:30:00Z',
    },
  ]

  logAction(actorName: string, role: any, action: string, module: string, details: string) {
    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorId: 'u-current',
      actorName,
      role,
      action,
      module,
      details,
      timestamp: new Date().toISOString(),
    })
  }
}

export const localStore = new LocalDataStore()
