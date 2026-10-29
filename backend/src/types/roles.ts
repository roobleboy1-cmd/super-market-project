export enum UserRole {
  ADMIN = 'Administrator',
  MANAGER = 'Manager',
  INVENTORY_MANAGER = 'Inventory Manager',
  CASHIER = 'Cashier',
  ACCOUNTANT = 'Accountant',
  AUDITOR = 'Auditor'
}

export type Permission =
  // Products & Catalog
  | 'products:view'
  | 'products:create'
  | 'products:update'
  | 'products:delete'
  | 'products:import_export'
  // Inventory
  | 'inventory:view'
  | 'inventory:adjust'
  | 'inventory:count'
  | 'inventory:approve_count'
  // Sales & POS
  | 'sales:view'
  | 'sales:checkout'
  | 'sales:void'
  | 'sales:refund'
  // Discounts & Coupons
  | 'discounts:manage'
  // Purchases & Suppliers
  | 'purchases:view'
  | 'purchases:create'
  | 'purchases:receive'
  | 'purchases:cancel'
  | 'suppliers:manage'
  // Customers & Loyalty
  | 'customers:view'
  | 'customers:manage'
  | 'loyalty:manage'
  // Shifts
  | 'shifts:open'
  | 'shifts:close'
  | 'shifts:approve'
  | 'shifts:move_cash'
  // Expenses
  | 'expenses:view'
  | 'expenses:create'
  | 'expenses:approve'
  // Reports & Analytics
  | 'reports:sales'
  | 'reports:financial'
  | 'reports:inventory'
  | 'reports:audit'
  // Settings & Users
  | 'users:manage'
  | 'settings:view'
  | 'settings:update';

export const RolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    'products:view', 'products:create', 'products:update', 'products:delete', 'products:import_export',
    'inventory:view', 'inventory:adjust', 'inventory:count', 'inventory:approve_count',
    'sales:view', 'sales:checkout', 'sales:void', 'sales:refund',
    'discounts:manage',
    'purchases:view', 'purchases:create', 'purchases:receive', 'purchases:cancel', 'suppliers:manage',
    'customers:view', 'customers:manage', 'loyalty:manage',
    'shifts:open', 'shifts:close', 'shifts:approve', 'shifts:move_cash',
    'expenses:view', 'expenses:create', 'expenses:approve',
    'reports:sales', 'reports:financial', 'reports:inventory', 'reports:audit',
    'users:manage', 'settings:view', 'settings:update'
  ],
  [UserRole.MANAGER]: [
    'products:view', 'products:create', 'products:update', 'products:import_export',
    'inventory:view', 'inventory:adjust', 'inventory:count', 'inventory:approve_count',
    'sales:view', 'sales:checkout', 'sales:void', 'sales:refund',
    'discounts:manage',
    'purchases:view', 'purchases:create', 'purchases:receive', 'suppliers:manage',
    'customers:view', 'customers:manage', 'loyalty:manage',
    'shifts:open', 'shifts:close', 'shifts:approve', 'shifts:move_cash',
    'expenses:view', 'expenses:create',
    'reports:sales', 'reports:inventory',
    'users:manage', 'settings:view'
  ],
  [UserRole.INVENTORY_MANAGER]: [
    'products:view', 'products:create', 'products:update', 'products:import_export',
    'inventory:view', 'inventory:adjust', 'inventory:count', 'inventory:approve_count',
    'purchases:view', 'purchases:create', 'purchases:receive', 'suppliers:manage',
    'reports:inventory'
  ],
  [UserRole.CASHIER]: [
    'products:view',
    'sales:view', 'sales:checkout',
    'customers:view', 'customers:manage',
    'shifts:open', 'shifts:close', 'shifts:move_cash'
  ],
  [UserRole.ACCOUNTANT]: [
    'sales:view', 'purchases:view',
    'expenses:view', 'expenses:create', 'expenses:approve',
    'reports:sales', 'reports:financial', 'reports:inventory',
    'shifts:approve'
  ],
  [UserRole.AUDITOR]: [
    'products:view', 'inventory:view', 'sales:view', 'purchases:view',
    'expenses:view', 'reports:sales', 'reports:financial', 'reports:inventory',
    'reports:audit', 'settings:view'
  ]
};
