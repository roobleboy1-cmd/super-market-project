import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Store, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Sun, Moon, Globe } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useLanguageStore } from '@/stores/languageStore'
import { useToast } from '@/components/ui/Toast'
import type { Role } from '@/types'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const { login } = useAuthStore()
  const { resolvedTheme, toggleTheme } = useThemeStore()
  const { language, toggleLanguage, t } = useLanguageStore()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const expired = searchParams.get('expired')
  const resetSuccess = searchParams.get('resetSuccess')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    try {
      const user = await login({ email, password })
      success(
        language === 'so' ? `Kusoo dhowaaw, ${user.name}!` : `Welcome back, ${user.name}!`,
        language === 'so' ? `Waxaad ku gashay: ${user.role}` : `Logged in as ${user.role}`
      )
      if (user.role === 'Cashier') {
        navigate('/pos')
      } else {
        navigate('/')
      }
    } catch (err: any) {
      const msg = err.message || (language === 'so' ? 'Email ama furaha sirta ah ayaa khaldan' : 'Invalid email or password')
      setErrorMsg(msg)
      error('Login Failed', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#F8FAFC] dark:bg-[#111827] transition-colors relative">
      {/* Top right quick controls for language and theme */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#374151] bg-white/80 dark:bg-[#1F2937]/80 hover:bg-[#F1F5F9] dark:hover:bg-[#374151] text-xs font-bold text-[#111827] dark:text-[#F9FAFB] shadow-xs transition cursor-pointer"
          title="Toggle Language / Beddel Luuqadda"
        >
          <Globe className="h-3.5 w-3.5 text-[#16A34A] dark:text-[#84CC16]" />
          <span>{language === 'so' ? '🇸🇴 SO' : '🇬🇧 EN'}</span>
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-[#E2E8F0] dark:border-[#374151] bg-white/80 dark:bg-[#1F2937]/80 hover:bg-[#F1F5F9] dark:hover:bg-[#374151] text-[#111827] dark:text-[#F9FAFB] shadow-xs transition cursor-pointer"
          title="Toggle Dark/Light Mode"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-[#16A34A]" />
          )}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#16A34A] via-[#15803D] to-[#84CC16] text-white shadow-lg shadow-green-600/25 mb-3">
          <Store className="h-7 w-7" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#16A34A] via-[#15803D] to-[#84CC16] dark:from-indigo-400 dark:via-blue-400 dark:to-cyan-400">
          SomSupermarket
        </h2>
        <p className="mt-1 text-xs text-[#64748B] dark:text-[#9CA3AF] font-medium">
          {language === 'so'
            ? 'Nidaamka Maamulka Dukaanka Dhexe — Albaabka Shaqaalaha'
            : 'Single Supermarket Management System — Staff Portal'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-[#1F2937] py-8 px-6 sm:px-10 shadow-xl shadow-black/5 dark:shadow-black/25 rounded-3xl border border-[#E2E8F0] dark:border-[#374151]">
          {expired && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-400 font-medium">
              {language === 'so'
                ? 'Wakhtigii gelitaanka wuu dhacay. Fadlan dib u gal.'
                : 'Your session has expired. Please log in again to continue.'}
            </div>
          )}

          {resetSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {language === 'so'
                ? 'Furaha sirta ah si guul leh ayaa loo beddelay!'
                : 'Password has been successfully updated! Please log in.'}
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={language === 'so' ? 'Email-ka Shaqaalaha' : 'Staff Email Address'}
              type="email"
              required
              leftIcon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@supermarket.so"
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">
                  {language === 'so' ? 'Furaha Sirta ah' : 'Password'}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[#16A34A] dark:text-[#84CC16] hover:underline"
                >
                  {language === 'so' ? 'Ma ilowday furaha?' : 'Forgot Password?'}
                </Link>
              </div>
              <Input
                type="password"
                required
                leftIcon={<Lock className="h-4 w-4" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
              {language === 'so' ? 'Gal Nidaamka' : 'Sign In to Store Portal'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-[#64748B] dark:text-[#9CA3AF] font-medium">
          SomSupermarket Management System • Production Grade
        </p>
      </div>
    </div>
  )
}
