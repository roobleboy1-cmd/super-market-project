import * as React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  Boxes,
  CalendarClock,
  ClipboardCheck,
  Truck,
  FileSpreadsheet,
  Receipt,
  RotateCcw,
  Users,
  Clock,
  Wallet,
  ShieldCheck,
  Tag,
  BarChart3,
  Bell,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Store,
  X,
  UserCheck,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAuthStore } from '@/stores/authStore'
import { useLanguageStore } from '@/stores/languageStore'
import type { Role } from '@/types'
import { ROLE_DESCRIPTIONS_SO, normalizeRole } from '@/utils/permissions'

interface NavSection {
  titleKey: string
  items: {
    nameKey: string
    path: string
    icon: React.ElementType
    roles?: Role[]
  }[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    titleKey: 'section.operations',
    items: [
      {
        nameKey: 'nav.dashboard',
        path: '/',
        icon: LayoutDashboard,
        roles: ['Super Admin', 'Manager', 'Inventory Manager', 'Accountant', 'Auditor'],
      },
      {
        nameKey: 'nav.pos',
        path: '/pos',
        icon: ShoppingCart,
        roles: ['Super Admin', 'Manager', 'Cashier'],
      },
      {
        nameKey: 'nav.sales',
        path: '/sales',
        icon: Receipt,
        roles: ['Super Admin', 'Manager', 'Cashier', 'Accountant', 'Auditor'],
      },
      {
        nameKey: 'nav.returns',
        path: '/returns',
        icon: RotateCcw,
        roles: ['Super Admin', 'Manager', 'Cashier', 'Accountant'],
      },
      {
        nameKey: 'nav.shifts',
        path: '/shifts',
        icon: Clock,
        roles: ['Super Admin', 'Manager', 'Cashier', 'Accountant'],
      },
    ],
  },
  {
    titleKey: 'section.catalog',
    items: [
      {
        nameKey: 'nav.products',
        path: '/products',
        icon: Package,
        roles: ['Super Admin', 'Manager', 'Inventory Manager'],
      },
      {
        nameKey: 'nav.categories',
        path: '/categories',
        icon: Layers,
        roles: ['Super Admin', 'Manager', 'Inventory Manager'],
      },
      {
        nameKey: 'nav.inventory',
        path: '/inventory',
        icon: Boxes,
        roles: ['Super Admin', 'Manager', 'Inventory Manager', 'Auditor'],
      },
      {
        nameKey: 'nav.batches',
        path: '/batches',
        icon: CalendarClock,
        roles: ['Super Admin', 'Manager', 'Inventory Manager', 'Auditor'],
      },
      {
        nameKey: 'nav.stockCounts',
        path: '/stock-counts',
        icon: ClipboardCheck,
        roles: ['Super Admin', 'Manager', 'Inventory Manager', 'Auditor'],
      },
    ],
  },
  {
    titleKey: 'section.purchasing',
    items: [
      {
        nameKey: 'nav.suppliers',
        path: '/suppliers',
        icon: Truck,
        roles: ['Super Admin', 'Manager', 'Inventory Manager', 'Accountant'],
      },
      {
        nameKey: 'nav.purchases',
        path: '/purchases',
        icon: FileSpreadsheet,
        roles: ['Super Admin', 'Manager', 'Inventory Manager', 'Accountant'],
      },
      {
        nameKey: 'nav.customers',
        path: '/customers',
        icon: Users,
        roles: ['Super Admin', 'Manager', 'Cashier'],
      },
      {
        nameKey: 'nav.promotions',
        path: '/promotions',
        icon: Tag,
        roles: ['Super Admin', 'Manager'],
      },
    ],
  },
  {
    titleKey: 'section.finance',
    items: [
      {
        nameKey: 'nav.expenses',
        path: '/expenses',
        icon: Wallet,
        roles: ['Super Admin', 'Manager', 'Accountant'],
      },
      {
        nameKey: 'nav.reports',
        path: '/reports',
        icon: BarChart3,
        roles: ['Super Admin', 'Manager', 'Accountant', 'Auditor'],
      },
      {
        nameKey: 'nav.employees',
        path: '/employees',
        icon: ShieldCheck,
        roles: ['Super Admin'],
      },
      {
        nameKey: 'nav.notifications',
        path: '/notifications',
        icon: Bell,
        roles: ['Super Admin', 'Manager', 'Inventory Manager', 'Cashier', 'Accountant', 'Auditor'],
      },
      {
        nameKey: 'nav.activityLogs',
        path: '/activity-logs',
        icon: History,
        roles: ['Super Admin', 'Manager', 'Auditor'],
      },
      {
        nameKey: 'nav.settings',
        path: '/settings',
        icon: Settings,
        roles: ['Super Admin'],
      },
    ],
  },
]

export const Sidebar: React.FC<{
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}> = ({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) => {
  const { user } = useAuthStore()
  const { t, language } = useLanguageStore()
  const location = useLocation()

  // Close mobile drawer when route changes
  React.useEffect(() => {
    onCloseMobile()
  }, [location.pathname])

  const currentRole: Role = normalizeRole(user?.role || 'Super Admin')
  const roleDesc = ROLE_DESCRIPTIONS_SO[currentRole]

  const renderNavList = (isMobileView: boolean = false) => (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {/* Role notice banner if restricted role */}
      {currentRole !== 'Super Admin' && (!collapsed || isMobileView) && (
        <div className="px-3 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-50/90 to-blue-50/90 dark:from-indigo-950/40 dark:to-blue-950/40 border border-green-200/80 dark:border-indigo-800/60 mb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
            <UserCheck className="h-3.5 w-3.5" />
            <span>
              {language === 'so' ? `Shaqadaada: ${roleDesc?.title}` : `Role: ${currentRole}`}
            </span>
          </div>
          <p className="text-[10px] text-[#64748B] dark:text-[#9CA3AF] mt-0.5 line-clamp-2 leading-tight">
            {language === 'so'
              ? 'Waxaa laguu soo saaray kaliya qaybaha aad awoodda u leedahay.'
              : 'Only workspace modules assigned to your role are visible.'}
          </p>
        </div>
      )}

      {NAV_SECTIONS.map((section) => {
        const visibleItems = section.items.filter(
          (item) => !item.roles || item.roles.includes(currentRole)
        )

        if (visibleItems.length === 0) return null

        return (
          <div key={section.titleKey} className="space-y-1">
            {(!collapsed || isMobileView) && (
              <h4 className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-[#94A3B8] dark:text-[#64748B] mb-2">
                {t(section.titleKey)}
              </h4>
            )}
            {visibleItems.map((item) => {
              const Icon = item.icon
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path)

              const label = t(item.nameKey)

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={collapsed && !isMobileView ? label : undefined}
                  onClick={() => {
                    if (isMobileView) onCloseMobile()
                  }}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150',
                    isActive
                      ? 'bg-gradient-to-r from-[#16A34A] via-[#15803D] to-[#166534] text-white shadow-sm shadow-green-600/25 font-bold'
                      : 'text-[#64748B] dark:text-[#9CA3AF] hover:bg-green-50/80 dark:hover:bg-[#374151]/80 hover:text-[#16A34A] dark:hover:text-[#84CC16]',
                    collapsed && !isMobileView && 'justify-center px-2'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110',
                      isActive ? 'text-white' : 'text-[#9CA3AF] group-hover:text-[#16A34A] dark:group-hover:text-[#84CC16]'
                    )}
                  />
                  {(!collapsed || isMobileView) && <span className="truncate flex-1">{label}</span>}
                </NavLink>
              )
            })}
          </div>
        )
      })}
    </div>
  )

  const renderUserFooter = (isMobileView: boolean = false) => (
    <div className="p-3 border-t border-[#E2E8F0] dark:border-[#374151] bg-[#F8FAFC]/50 dark:bg-[#1F2937]/40">
      <div className={cn('flex items-center gap-2.5', collapsed && !isMobileView && 'justify-center')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#16A34A] to-[#84CC16] text-white font-extrabold text-xs shadow-xs">
          {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
        </div>
        {(!collapsed || isMobileView) && (
          <div className="flex flex-col truncate flex-1 min-w-0">
            <span className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] truncate">
              {user?.name || 'Administrator'}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.2 rounded-full border truncate',
                  roleDesc?.bgBadge || 'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]'
                )}
              >
                {currentRole}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* DESKTOP SIDEBAR (Visible on md and larger) */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r border-[#E2E8F0] dark:border-[#374151] bg-white dark:bg-[#111827] transition-all duration-300 z-30 select-none shrink-0 h-screen sticky top-0 shadow-xs',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E2E8F0] dark:border-[#374151]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#16A34A] via-[#15803D] to-[#84CC16] text-white shadow-md shadow-green-600/25">
              <Store className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="text-sm font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#16A34A] via-[#166534] to-[#84CC16] dark:from-[#16A34A] dark:via-[#84CC16] dark:to-[#84CC16] truncate">
                  {t('app.name')}
                </span>
                <span className="text-[10px] font-bold text-[#64748B] dark:text-[#9CA3AF] truncate tracking-wide">
                  {t('app.singleStore')}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onToggleCollapse}
            className="rounded-xl p-1.5 text-[#64748B] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#F1F5F9] dark:hover:bg-[#374151] transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {renderNavList(false)}
        {renderUserFooter(false)}
      </aside>

      {/* MOBILE RESPONSIVE DRAWER */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-[#111827]/70 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />
          {/* Drawer content */}
          <div className="relative flex flex-col w-72 max-w-[85vw] bg-white dark:bg-[#111827] border-r border-[#E2E8F0] dark:border-[#374151] shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="h-16 flex items-center justify-between px-4 border-b border-[#E2E8F0] dark:border-[#374151]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#16A34A] via-[#15803D] to-[#84CC16] text-white shadow-md shadow-green-600/25">
                  <Store className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#16A34A] via-[#166534] to-[#84CC16] dark:from-[#16A34A] dark:to-[#84CC16]">
                    {t('app.name')}
                  </span>
                  <span className="text-[10px] font-bold text-[#64748B] dark:text-[#9CA3AF]">
                    {t('app.singleStore')}
                  </span>
                </div>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-xl text-[#64748B] hover:text-[#111827] dark:hover:text-[#F9FAFB]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {renderNavList(true)}
            {renderUserFooter(true)}
          </div>
        </div>
      )}
    </>
  )
}
