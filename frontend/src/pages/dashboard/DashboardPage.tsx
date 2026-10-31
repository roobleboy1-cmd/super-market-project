import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  CalendarClock,
  ArrowUpRight,
  PlusCircle,
  Clock,
  RotateCcw,
  Receipt,
  FileSpreadsheet,
  Package,
  Sparkles,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { dashboardService } from '@/services/api/dashboardService'
import { useLanguageStore } from '@/stores/languageStore'
import { formatCurrency, formatDate } from '@/utils/formatters'

const PALETTE = ['#16A34A', '#84CC16', '#F97316', '#166534', '#06B6D4', '#EAB308', '#10B981']

export const DashboardPage: React.FC = () => {
  const [chartPeriod, setChartPeriod] = React.useState<'7d' | '30d' | '90d'>('7d')
  const { t, language } = useLanguageStore()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
    refetchInterval: 15000,
  })

  const { data: salesChart, isLoading: chartLoading } = useQuery({
    queryKey: ['dashboard-chart', chartPeriod],
    queryFn: () => dashboardService.getSalesChart(chartPeriod),
  })

  const { data: paymentBreakdown } = useQuery({
    queryKey: ['dashboard-payments'],
    queryFn: () => dashboardService.getPaymentBreakdown(),
  })

  const { data: topProducts } = useQuery({
    queryKey: ['dashboard-top-products'],
    queryFn: () => dashboardService.getTopSellingProducts(),
  })

  const { data: recentSales } = useQuery({
    queryKey: ['dashboard-recent-sales'],
    queryFn: () => dashboardService.getRecentSales(),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dash.title')}
        description={t('dash.subtitle')}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/pos">
              <Button
                variant="success"
                size="sm"
                className="gap-2 shadow-xs shadow-emerald-500/20"
              >
                <ShoppingCart className="h-4 w-4" />
                {t('dash.newSale')}
              </Button>
            </Link>
            <Link to="/products?action=new">
              <Button variant="outline" size="sm" className="gap-2">
                <PlusCircle className="h-4 w-4 text-indigo-500" />
                {t('dash.addProduct')}
              </Button>
            </Link>
            <Link to="/purchases?action=new">
              <Button variant="outline" size="sm" className="gap-2">
                <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                {language === 'so' ? 'Dalbo Alaab' : 'Purchase Order'}
              </Button>
            </Link>
            <Link to="/stock-counts">
              <Button variant="outline" size="sm" className="gap-2">
                <Boxes className="h-4 w-4 text-amber-500" />
                {t('dash.adjustStock')}
              </Button>
            </Link>
          </div>
        }
      />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </>
        ) : (
          <>
            <StatCard
              title={t('dash.todaySales')}
              value={formatCurrency(stats?.todaySalesRevenue || 0)}
              description={
                language === 'so'
                  ? `${stats?.todayTransactionCount || 0} iib oo la dhameeyay`
                  : `${stats?.todayTransactionCount || 0} transactions completed`
              }
              trend={{ value: '+14.2% vs shalay', isPositive: true }}
              icon={DollarSign}
              iconColor="bg-gradient-to-br from-[#16A34A] to-[#166534] text-white shadow-md shadow-green-600/25"
            />
            <StatCard
              title={t('dash.grossProfit')}
              value={formatCurrency(stats?.todayGrossProfit || 0)}
              description={
                language === 'so'
                  ? `Celcelis: ${formatCurrency(stats?.avgTransactionValue || 0)}`
                  : `Avg ticket: ${formatCurrency(stats?.avgTransactionValue || 0)}`
              }
              trend={{ value: '~32% Margin', isPositive: true }}
              icon={TrendingUp}
              iconColor="bg-gradient-to-br from-[#84CC16] to-[#65A30D] text-white shadow-md shadow-lime-500/25"
            />
            <StatCard
              title={t('dash.inventoryVal')}
              value={formatCurrency(stats?.totalInventoryValuation || 0)}
              description={
                language === 'so'
                  ? `${stats?.totalProducts || 0} Alaabood • ${stats?.totalCategories || 0} Qaybood`
                  : `${stats?.totalProducts || 0} Products in ${stats?.totalCategories || 0} Categories`
              }
              icon={Boxes}
              iconColor="bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white shadow-md shadow-orange-500/25"
            />
            <StatCard
              title={t('dash.activeShift')}
              value={
                stats?.currentShiftActive
                  ? language === 'so'
                    ? 'Shift Furan'
                    : 'Shift Open'
                  : language === 'so'
                  ? 'Shift Xiran'
                  : 'Shift Closed'
              }
              description={
                stats?.activeShiftCashier
                  ? `${language === 'so' ? 'Khasnaji' : 'Cashier'}: ${stats.activeShiftCashier}`
                  : language === 'so'
                  ? 'Khasnaddu way xiran tahay'
                  : 'No active drawer'
              }
              icon={Clock}
              iconColor={
                stats?.currentShiftActive
                  ? 'bg-gradient-to-br from-[#16A34A] to-[#15803D] text-white shadow-md shadow-green-600/25'
                  : 'bg-gradient-to-br from-[#F97316] to-[#C2410C] text-white shadow-md shadow-orange-500/25'
              }
            />
          </>
        )}
      </div>

      {/* Critical Operational Banner Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/inventory?filter=low_stock"
          className="group flex items-center justify-between p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-r from-amber-50/70 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10 hover:border-amber-400 dark:hover:border-amber-700 transition-all duration-200 shadow-2xs hover:shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                {t('dash.lowStock')} & {t('dash.outOfStock')}
              </p>
              <p className="text-sm font-extrabold text-amber-950 dark:text-amber-100 mt-0.5">
                {stats?.lowStockCount || 0} {language === 'so' ? 'Dhamaanaya' : 'Low'} •{' '}
                {stats?.outOfStockCount || 0} {language === 'so' ? 'Go\'ay' : 'Out'}
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-amber-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>

        <Link
          to="/batches?filter=near_expiry"
          className="group flex items-center justify-between p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-gradient-to-r from-rose-50/70 to-red-50/40 dark:from-rose-950/20 dark:to-red-950/10 hover:border-rose-400 dark:hover:border-rose-700 transition-all duration-200 shadow-2xs hover:shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0 group-hover:scale-105 transition-transform">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-900 dark:text-rose-300">
                {t('dash.nearExpiry')} (&lt;30 {language === 'so' ? 'Maalmood' : 'days'})
              </p>
              <p className="text-sm font-extrabold text-rose-950 dark:text-rose-100 mt-0.5">
                {stats?.approachingExpiryCount || 0}{' '}
                {language === 'so' ? 'Batches oo u baahan FEFO sale' : 'Batches require FEFO'}
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-rose-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>

        <Link
          to="/returns?status=pending_approval"
          className="group flex items-center justify-between p-4 rounded-2xl border border-green-200/80 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/70 to-blue-50/40 dark:from-indigo-950/20 dark:to-blue-950/10 hover:border-indigo-400 dark:hover:border-indigo-700 transition-all duration-200 shadow-2xs hover:shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/15 text-[#16A34A] dark:text-[#84CC16] shrink-0 group-hover:scale-105 transition-transform">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                {t('dash.pendingRefunds')}
              </p>
              <p className="text-sm font-extrabold text-indigo-950 dark:text-indigo-100 mt-0.5">
                {stats?.pendingRefundCount || 0} {language === 'so' ? 'Celinta' : 'Refunds'} •{' '}
                {stats?.outstandingPoCount || 0} {language === 'so' ? 'Dalab' : 'POs'}
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-[#16A34A] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>

      {/* Sales Trend Chart & Payment Methods Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Sales Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>{t('dash.salesTrend')}</CardTitle>
              <p className="text-xs text-[#64748B] dark:text-[#9CA3AF] mt-0.5">
                {language === 'so'
                  ? 'Iibka dukaanka oo toos looga diiwaangeliyay nidaamka'
                  : 'Real-time transaction revenue & gross margins aggregated'}
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-[#E2E8F0] dark:border-[#374151] p-1 bg-[#F8FAFC] dark:bg-[#111827] text-xs">
              {(['7d', '30d', '90d'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all duration-150 cursor-pointer ${
                    chartPeriod === period
                      ? 'bg-gradient-to-r from-[#16A34A] to-[#15803D] text-white shadow-2xs'
                      : 'text-[#64748B] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB]'
                  }`}
                >
                  {period === '7d'
                    ? language === 'so'
                      ? '7 Maalmood'
                      : '7 Days'
                    : period === '30d'
                    ? language === 'so'
                      ? '30 Maalmood'
                      : '30 Days'
                    : language === 'so'
                    ? '90 Maalmood'
                    : '90 Days'}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <Skeleton className="h-72 w-full rounded-2xl" />
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={salesChart || []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16A34A" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#84CC16" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#84CC16" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-slate-200/80 dark:stroke-slate-800/80"
                    />
                    <XAxis dataKey="date" className="text-xs" stroke="#9CA3AF" />
                    <YAxis className="text-xs" stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        borderColor: '#374151',
                        borderRadius: '1rem',
                        color: '#F9FAFB',
                        fontSize: '12px',
                        fontWeight: 600,
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                      }}
                      formatter={(val: any) => [`$${val}`, '']}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name={language === 'so' ? 'Iibka Guud' : 'Sales Revenue'}
                      stroke="#16A34A"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      name={language === 'so' ? 'Faa\'iidada' : 'Gross Profit'}
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorProfit)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dash.salesByMethod')}</CardTitle>
            <p className="text-xs text-[#64748B] dark:text-[#9CA3AF] mt-0.5">
              EVC Plus, eDahab, ZAAD, Card & Cash
            </p>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentBreakdown || []}
                    dataKey="total"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={46}
                    paddingAngle={4}
                  >
                    {(paymentBreakdown || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`$${val}`, 'Amount']}
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      borderColor: '#374151',
                      borderRadius: '0.75rem',
                      color: '#F9FAFB',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-2 mt-2">
              {(paymentBreakdown || []).map((item, idx) => (
                <div key={item.method} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                    />
                    <span className="text-[#334155] dark:text-[#9CA3AF] font-semibold">
                      {item.method}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#111827] dark:text-[#F9FAFB]">
                      ${(item.total ?? 0).toFixed(2)}
                    </span>
                    <span className="text-[#94A3B8] text-[11px] font-bold">
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Store Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('dash.recentSales')}</CardTitle>
              <p className="text-xs text-[#64748B] dark:text-[#9CA3AF] mt-0.5">
                {language === 'so' ? 'Rasiidhadhkii ugu dambeeyay ee dukaanka' : 'Latest completed checkout receipts'}
              </p>
            </div>
            <Link
              to="/sales"
              className="text-xs font-bold text-[#16A34A] dark:text-[#84CC16] hover:underline inline-flex items-center gap-1"
            >
              {t('action.viewAll')}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-[#E2E8F0] dark:divide-[#374151]/80">
              {(recentSales || []).map((sale) => (
                <div key={sale.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#16A34A] dark:text-[#84CC16] shrink-0">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] font-mono">
                        {sale.invoiceNumber}
                      </p>
                      <p className="text-[11px] text-[#64748B] font-medium">
                        {sale.cashierName} • {formatDate(sale.createdAt, true)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-[#111827] dark:text-[#F9FAFB]">
                      ${(sale.total ?? 0).toFixed(2)}
                    </p>
                    <Badge variant="success" size="sm" dot className="mt-0.5">
                      {sale.payments[0]?.method || 'Paid'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Velocity Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('dash.topProducts')}</CardTitle>
              <p className="text-xs text-[#64748B] dark:text-[#9CA3AF] mt-0.5">
                {language === 'so' ? 'Alaabta tirada ugu badan laga iibsaday' : 'Highest volume sold items'}
              </p>
            </div>
            <Link
              to="/products"
              className="text-xs font-bold text-[#16A34A] dark:text-[#84CC16] hover:underline inline-flex items-center gap-1"
            >
              {t('nav.products')}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-[#E2E8F0] dark:divide-[#374151]/80">
              {(topProducts || []).map((prod: any, idx: number) => (
                <div key={prod.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-[#16A34A] to-[#166534] text-white text-xs font-extrabold shadow-2xs shrink-0">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">{prod.name}</p>
                      <p className="text-[11px] text-[#64748B] font-medium">{prod.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-[#111827] dark:text-[#F9FAFB]">
                      {prod.unitsSold} {language === 'so' ? 'xabbad' : 'sold'}
                    </p>
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ${(prod.revenue ?? 0).toFixed(2)} rev
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
