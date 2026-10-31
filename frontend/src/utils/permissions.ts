import type { Role, User } from '@/types'

export function normalizeRole(role: string): Role {
  if (role === 'Administrator') return 'Super Admin'
  return (role as Role) || 'Super Admin'
}

export const ROLE_ALLOWED_PATHS: Record<Role, string[]> & Record<string, string[]> = {
  'Super Admin': [
    '/',
    '/pos',
    '/sales',
    '/returns',
    '/shifts',
    '/products',
    '/categories',
    '/inventory',
    '/batches',
    '/stock-counts',
    '/suppliers',
    '/purchases',
    '/customers',
    '/promotions',
    '/expenses',
    '/reports',
    '/employees',
    '/notifications',
    '/activity-logs',
    '/settings',
  ],
  Administrator: [
    '/',
    '/pos',
    '/sales',
    '/returns',
    '/shifts',
    '/products',
    '/categories',
    '/inventory',
    '/batches',
    '/stock-counts',
    '/suppliers',
    '/purchases',
    '/customers',
    '/promotions',
    '/expenses',
    '/reports',
    '/employees',
    '/notifications',
    '/activity-logs',
    '/settings',
  ],
  Manager: [
    '/',
    '/pos',
    '/sales',
    '/returns',
    '/shifts',
    '/products',
    '/categories',
    '/inventory',
    '/batches',
    '/stock-counts',
    '/suppliers',
    '/purchases',
    '/customers',
    '/promotions',
    '/expenses',
    '/reports',
    '/notifications',
    '/activity-logs',
  ],
  Cashier: [
    '/pos',
    '/sales',
    '/returns',
    '/shifts',
    '/customers',
    '/notifications',
  ],
  'Inventory Manager': [
    '/',
    '/products',
    '/categories',
    '/inventory',
    '/batches',
    '/stock-counts',
    '/suppliers',
    '/purchases',
    '/notifications',
    '/activity-logs',
  ],
  Accountant: [
    '/',
    '/sales',
    '/returns',
    '/shifts',
    '/suppliers',
    '/purchases',
    '/expenses',
    '/reports',
    '/notifications',
    '/activity-logs',
  ],
  Auditor: [
    '/',
    '/sales',
    '/inventory',
    '/batches',
    '/stock-counts',
    '/reports',
    '/activity-logs',
    '/notifications',
  ],
}

export const ROLE_DEFAULT_REDIRECT: Record<Role, string> & Record<string, string> = {
  'Super Admin': '/',
  Administrator: '/',
  Manager: '/',
  Cashier: '/pos',
  'Inventory Manager': '/inventory',
  Accountant: '/reports',
  Auditor: '/activity-logs',
}

export const ROLE_DESCRIPTIONS_SO: Record<
  string,
  { title: string; job: string; color: string; bgBadge: string }
> = {
  'Super Admin': {
    title: 'Maamulaha Guud',
    job: 'Dhammaan shaqooyinka nidaamka, settings-ka & shaqaalaha',
    color: 'text-purple-700 dark:text-purple-300',
    bgBadge: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  Administrator: {
    title: 'Maamulaha Guud',
    job: 'Dhammaan shaqooyinka nidaamka, settings-ka & shaqaalaha',
    color: 'text-purple-700 dark:text-purple-300',
    bgBadge: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  Manager: {
    title: 'Maamulaha Hawlgalka',
    job: 'Iibka, stock-ga, fasaxa celinta & warbixinada dukaanka',
    color: 'text-blue-700 dark:text-blue-300',
    bgBadge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  Cashier: {
    title: 'Khasnaji (POS)',
    job: 'Kaliya Point of Sale (POS), rasiidhada & shift-ka lacagta',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgBadge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  'Inventory Manager': {
    title: 'Maamulaha Bakhaarka',
    job: 'Kaliya kaydka alaabta, batches & dalabaadka alaab-qeybiyaha',
    color: 'text-amber-700 dark:text-amber-300',
    bgBadge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  Accountant: {
    title: 'Xisaabiye Guud',
    job: 'Kaliya kharashaadka, xisaabaadka iibka & faa\'iidada (P&L)',
    color: 'text-cyan-700 dark:text-cyan-300',
    bgBadge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  },
  Auditor: {
    title: 'Hanti-dhowre',
    job: 'Kaliya baarista stock-ga, xisaab xaqiijinta & logs-ka hawlaha',
    color: 'text-rose-700 dark:text-rose-300',
    bgBadge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
}

export function isPathAllowedForRole(role: any, path: string): boolean {
  const normRole = normalizeRole(role)
  if (normRole === 'Super Admin') return true
  const allowed = ROLE_ALLOWED_PATHS[normRole] || []
  if (path === '/') return allowed.includes('/')
  return allowed.some((allowedPath) => {
    if (allowedPath === '/') return false
    return path.startsWith(allowedPath)
  })
}
