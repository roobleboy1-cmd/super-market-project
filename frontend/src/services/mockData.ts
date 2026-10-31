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
  DashboardStats,
  StockMovement,
} from '@/types'

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'SomSupermarket Central',
  tagline: 'Single Supermarket Management System',
  logoUrl: '',
  phone: '+252 61 5000000',
  email: 'contact@supermarket.so',
  address: 'KM4 Maka Al-Mukarama Road',
  city: 'Mogadishu, Somalia',
  taxNumber: 'TAX-SO-992211',
  currency: 'USD',
  timezone: 'Africa/Mogadishu',
  defaultTaxRate: 5,
  taxInclusive: true,
  thermalPrinterType: '80mm',
  receiptHeader: '*** SOMSUPERMARKET ***\nWaad ku mahadsan tahay booqashadaada!',
  receiptFooter: 'Badeecadaha waa la soo celin karaa 48 saac gudahood.',
  lowStockThresholdDefault: 10,
  expiryAlertDaysDefault: 30,
  loyaltyPointsPerDollar: 1,
  loyaltyRedemptionRate: 0.01,
  enabledPaymentMethods: ['Cash', 'Card', 'EVC Plus', 'eDahab', 'ZAAD'],
}

export const INITIAL_USERS: User[] = []
export const INITIAL_CATEGORIES: Category[] = []
export const INITIAL_BRANDS: Brand[] = []
export const INITIAL_SUPPLIERS: Supplier[] = []
export const INITIAL_PRODUCTS: Product[] = []
export const INITIAL_BATCHES: BatchLot[] = []
export const INITIAL_CUSTOMERS: Customer[] = []
export const INITIAL_CURRENT_SHIFT: CashierShift | null = null
export const INITIAL_SALES: Sale[] = []
export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = []
export const INITIAL_RETURNS: SalesReturn[] = []
export const INITIAL_EXPENSES: Expense[] = []
export const INITIAL_PROMOTIONS: Promotion[] = []
export const INITIAL_COUPONS: Coupon[] = []
export const INITIAL_NOTIFICATIONS: NotificationItem[] = []
export const INITIAL_AUDIT_LOGS: AuditLog[] = []
export const INITIAL_STOCK_ADJUSTMENTS: StockAdjustment[] = []
export const INITIAL_PHYSICAL_COUNTS: PhysicalCount[] = []
export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = []
export const INITIAL_DASHBOARD_STATS: DashboardStats = {
  totalProducts: 0,
  totalCategories: 0,
  todaySalesRevenue: 0,
  todayGrossProfit: 0,
  todayTransactionCount: 0,
  avgTransactionValue: 0,
  totalInventoryValuation: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  approachingExpiryCount: 0,
  currentShiftActive: false,
  pendingRefundCount: 0,
  outstandingPoCount: 0,
}
