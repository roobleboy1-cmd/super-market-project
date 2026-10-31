import * as React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Search,
  Bell,
  Sun,
  Moon,
  Laptop,
  Wifi,
  WifiOff,
  LogOut,
  ShoppingCart,
  Command,
  RefreshCw,
  Menu,
  ChevronDown,
  UserCheck,
  Check,
  Globe,
  Sparkles,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useLanguageStore } from '@/stores/languageStore'
import { useOfflineStore } from '@/stores/offlineStore'
import { useToast } from '@/components/ui/Toast'
import { localStore } from '@/services/dataStore'
import { cn } from '@/utils/cn'
import type { Role } from '@/types'
import {
  ROLE_DESCRIPTIONS_SO,
  ROLE_DEFAULT_REDIRECT,
  isPathAllowedForRole,
  normalizeRole,
} from '@/utils/permissions'

const AVAILABLE_ROLES: { role: Role; demoEmail: string }[] = [
  { role: 'Super Admin', demoEmail: 'admin@supermarket.so' },
  { role: 'Manager', demoEmail: 'fadumo.mgr@supermarket.so' },
  { role: 'Cashier', demoEmail: 'hassan.cashier@supermarket.so' },
  { role: 'Inventory Manager', demoEmail: 'khadija.inv@supermarket.so' },
  { role: 'Accountant', demoEmail: 'jama.acc@supermarket.so' },
  { role: 'Auditor', demoEmail: 'sahra.audit@supermarket.so' },
]

export const Header: React.FC<{
  onOpenCommandPalette: () => void
  onToggleMobileMenu: () => void
}> = ({ onOpenCommandPalette, onToggleMobileMenu }) => {
  const { user, logout, switchRoleUser } = useAuthStore()
  const { theme, resolvedTheme, setTheme, toggleTheme } = useThemeStore()
  const { language, setLanguage, toggleLanguage, t } = useLanguageStore()
  const { isOnline, queuedTransactions, isSyncing, syncTransactions } = useOfflineStore()
  const { success } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [profileOpen, setProfileOpen] = React.useState(false)
  const [roleSwitcherOpen, setRoleSwitcherOpen] = React.useState(false)
  const [langMenuOpen, setLangMenuOpen] = React.useState(false)

  const unreadNotificationsCount = localStore.notifications.filter((n) => !n.read).length
  const currentShift = localStore.currentShift

  const currentRole: Role = normalizeRole(user?.role || 'Super Admin')
  const currentRoleInfo = ROLE_DESCRIPTIONS_SO[currentRole]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleSwitchRole = (targetRole: Role) => {
    const newUser = switchRoleUser(targetRole)
    setRoleSwitcherOpen(false)
    if (newUser) {
      success(
        language === 'so' ? `Doorka: ${targetRole}` : `Role: ${targetRole}`,
        language === 'so'
          ? `${newUser.name} — Hadda waxa kuu muuqanaya kaliya shaqada ${targetRole}!`
          : `${newUser.name} — Screen updated to only display ${targetRole} operations!`
      )

      if (!isPathAllowedForRole(targetRole, location.pathname)) {
        navigate(ROLE_DEFAULT_REDIRECT[targetRole] || '/')
      }
    }
  }

  const handleToggleLang = () => {
    toggleLanguage()
    const nextLang = language === 'so' ? 'en' : 'so'
    success(
      nextLang === 'so' ? 'Luuqadda: Soomaali 🇸🇴' : 'Language: English 🇬🇧',
      nextLang === 'so'
        ? 'Nidaamka oo dhan waxa loo rogay Af-Soomaali'
        : 'All supermarket modules switched to English'
    )
  }

  return (
    <header className="h-16 border-b border-[#E2E8F0] dark:border-[#374151] bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl sticky top-0 z-20 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 transition-colors">
      {/* Left: Mobile Hamburger Toggle Button + Search Bar */}
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-xl text-[#64748B] hover:text-[#111827] dark:text-[#9CA3AF] dark:hover:text-[#F9FAFB] hover:bg-[#F1F5F9] dark:hover:bg-[#374151] md:hidden shrink-0 transition"
          title="Open Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search Bar & Command Palette Button */}
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between rounded-xl border border-[#E2E8F0] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] px-3.5 py-2 text-xs text-[#64748B] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:border-[#16A34A]/50 dark:hover:border-[#16A34A]/50 transition-all duration-150 shadow-2xs cursor-pointer"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Search className="h-4 w-4 text-[#16A34A] shrink-0" />
            <span className="truncate hidden sm:inline">{t('header.search')}</span>
            <span className="truncate sm:hidden">{t('header.searchShort')}</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md bg-[#E2E8F0] dark:bg-[#374151] px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[#64748B] dark:text-[#9CA3AF] border border-slate-300/60 dark:border-[#4B5563]">
            <Command className="h-3 w-3" /> K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* TRANSLATION BUTTON (🇸🇴 SO / 🇬🇧 EN) */}
        <div className="relative">
          <button
            onClick={handleToggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#374151] bg-white/80 dark:bg-[#1F2937]/80 hover:bg-green-50/80 dark:hover:bg-[#374151] text-[#111827] dark:text-[#F9FAFB] hover:border-[#16A34A] dark:hover:border-[#84CC16] transition font-bold text-xs shadow-2xs cursor-pointer group"
            title={language === 'so' ? 'U Beddel English' : 'Switch to Somali'}
          >
            <Globe className="h-3.5 w-3.5 text-[#16A34A] dark:text-[#84CC16] group-hover:rotate-45 transition-transform duration-300" />
            <span className="text-[11px] font-bold">
              {language === 'so' ? '🇸🇴 SO' : '🇬🇧 EN'}
            </span>
          </button>
        </div>

        {/* DIRECT DARK / LIGHT MODE BUTTON */}
        <button
          onClick={() => {
            const willBeDark = resolvedTheme !== 'dark'
            toggleTheme()
            success(
              willBeDark ? '🌙 Dark Mode' : '☀️ Light Mode',
              willBeDark
                ? (language === 'so' ? 'Muuqaalka madowga ayaa la shiday' : 'Switched to modern dark mode')
                : (language === 'so' ? 'Muuqaalka iftiinka ayaa la shiday' : 'Switched to clean light mode')
            )
          }}
          className="p-2 rounded-xl border border-[#E2E8F0] dark:border-[#374151] bg-white/80 dark:bg-[#1F2937]/80 hover:bg-[#F1F5F9] dark:hover:bg-[#374151] transition text-[#111827] dark:text-[#F9FAFB] shadow-2xs group cursor-pointer hover:border-[#16A34A] dark:hover:border-[#84CC16]"
          title={
            resolvedTheme === 'dark'
              ? (language === 'so' ? 'Shid Iftiinka (Light Mode)' : 'Switch to Light Mode')
              : (language === 'so' ? 'Shid Madowga (Dark Mode)' : 'Switch to Dark Mode')
          }
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400 group-hover:rotate-90 transition-transform duration-300" />
          ) : (
            <Moon className="h-4 w-4 text-[#16A34A] group-hover:-rotate-20 transition-transform duration-300" />
          )}
        </button>

        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-green-200/80 dark:border-green-900/60 bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-950/40 dark:to-emerald-950/40 text-green-700 dark:text-green-300 hover:border-green-400 dark:hover:border-green-600 transition text-xs font-semibold shadow-2xs cursor-pointer"
            title={language === 'so' ? 'Eeg shaqada doorka kale' : 'Switch role demo'}
          >
            <UserCheck className="h-3.5 w-3.5 shrink-0 text-[#16A34A]" />
            <span className="hidden xl:inline truncate max-w-[100px]">
              {user?.name?.split(' ')[0] || 'User'}:
            </span>
            <span className="font-bold truncate max-w-[90px] sm:max-w-none">
              {currentRole}
            </span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {roleSwitcherOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#E2E8F0] dark:border-[#374151] bg-white dark:bg-[#1F2937] p-2.5 shadow-2xl z-50 animate-in zoom-in-95 text-xs">
              <div className="px-3 py-2 border-b border-[#E2E8F0] dark:border-[#374151]">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[#111827] dark:text-[#F9FAFB] text-xs">
                    {language === 'so' ? 'Shaqooyinka Supermarket-ka' : 'Supermarket Roles (RBAC)'}
                  </p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    6 Staff
                  </span>
                </div>
                <p className="text-[10px] text-[#64748B] dark:text-[#9CA3AF] mt-0.5">
                  {language === 'so'
                    ? 'Doorka aad dooratid shaqadiisa bas ayaa kuu soo baxaysa:'
                    : 'Select any role to view their restricted workspace:'}
                </p>
              </div>

              <div className="py-1.5 space-y-1 max-h-80 overflow-y-auto">
                {AVAILABLE_ROLES.map(({ role }) => {
                  const isCurrent = currentRole === role
                  const info = ROLE_DESCRIPTIONS_SO[role]
                  const matchedUser = localStore.users.find((u) => u.role === role)

                  return (
                    <button
                      key={role}
                      onClick={() => handleSwitchRole(role)}
                      className={cn(
                        'w-full text-left p-2.5 rounded-xl transition-all duration-150 flex items-start justify-between gap-2.5',
                        isCurrent
                          ? 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/60 dark:to-blue-950/60 border border-green-200 dark:border-indigo-800/80 shadow-2xs'
                          : 'hover:bg-[#F8FAFC] dark:hover:bg-[#374151]/70 border border-transparent'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#111827] dark:text-[#F9FAFB] text-xs">
                            {role}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-600 text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#334155] dark:text-[#9CA3AF] font-semibold truncate mt-0.5">
                          {matchedUser?.name || 'Staff Member'}
                        </p>
                        <p className="text-[10px] text-[#64748B] dark:text-[#9CA3AF] line-clamp-1 mt-0.5">
                          {info.job}
                        </p>
                      </div>

                      {isCurrent && (
                        <Check className="h-4 w-4 text-[#16A34A] dark:text-[#84CC16] shrink-0 mt-1" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Offline / Online Sync Indicator */}
        <div className="hidden sm:flex items-center">
          {isOnline ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t('header.online')}</span>
              {queuedTransactions.length > 0 && (
                <button
                  onClick={() => syncTransactions()}
                  disabled={isSyncing}
                  className="ml-1 inline-flex items-center gap-1 font-bold underline hover:opacity-80"
                >
                  <RefreshCw className={cn('h-3 w-3', isSyncing && 'animate-spin')} />
                  {t('header.sync')} ({queuedTransactions.length})
                </button>
              )}
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <WifiOff className="h-3 w-3" />
              <span>{t('header.offline')}</span> ({queuedTransactions.length})
            </div>
          )}
        </div>

        {/* Current Cashier Shift Indicator (if permitted) */}
        {['Super Admin', 'Manager', 'Cashier', 'Accountant'].includes(currentRole) && (
          <Link
            to="/shifts"
            className="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-green-200/80 dark:border-indigo-800 hover:bg-indigo-100 transition"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span>
              {currentShift?.status === 'open' ? t('header.shiftActive') : t('header.shiftClosed')}
            </span>
          </Link>
        )}

        {/* Quick Launch POS Button (if permitted) */}
        {['Super Admin', 'Manager', 'Cashier'].includes(currentRole) && (
          <Link
            to="/pos"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xs shadow-emerald-500/20 active:scale-[0.98] transition-all"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{t('header.openPos')}</span>
          </Link>
        )}

        {/* Notifications Icon */}
        <Link
          to="/notifications"
          className="relative p-2 rounded-xl text-[#64748B] hover:text-[#1E293B] dark:text-[#9CA3AF] dark:hover:text-slate-100 hover:bg-[#F1F5F9] dark:hover:bg-[#374151] transition"
          title={t('nav.notifications')}
        >
          <Bell className="h-4 w-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-950 animate-pulse">
              {unreadNotificationsCount}
            </span>
          )}
        </Link>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-0.5 rounded-xl hover:ring-2 hover:ring-indigo-500/40 transition cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#16A34A] to-[#166534] text-white font-extrabold text-xs shadow-xs">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
            </div>
          </button>
          {profileOpen && (
            <div
              className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#E2E8F0] dark:border-[#374151] bg-white dark:bg-[#1F2937] py-2 shadow-2xl z-50 text-xs animate-in zoom-in-95"
              onClick={() => setProfileOpen(false)}
            >
              <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#374151]">
                <p className="font-bold text-[#111827] dark:text-[#F9FAFB] truncate text-sm">
                  {user?.name || 'Administrator'}
                </p>
                <p className="text-[11px] text-[#64748B] dark:text-[#9CA3AF] truncate mt-0.5">
                  {user?.email || 'admin@supermarket.so'}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                      currentRoleInfo?.bgBadge
                    )}
                  >
                    {currentRole}
                  </span>
                </div>
              </div>

              {currentRole === 'Super Admin' && (
                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-4 py-2.5 text-[#334155] dark:text-[#9CA3AF] hover:bg-[#F1F5F9] dark:hover:bg-[#374151] font-medium"
                >
                  {t('header.storeSettings')}
                </Link>
              )}

              <Link
                to="/activity-logs"
                className="flex items-center gap-2 px-4 py-2.5 text-[#334155] dark:text-[#9CA3AF] hover:bg-[#F1F5F9] dark:hover:bg-[#374151] font-medium"
              >
                {t('header.activityLogs')}
              </Link>

              <div className="border-t border-[#E2E8F0] dark:border-[#374151] my-1" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold"
              >
                <LogOut className="h-3.5 w-3.5" /> {t('header.signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
