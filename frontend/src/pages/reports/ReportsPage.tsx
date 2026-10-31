import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  DollarSign,
  FileSpreadsheet,
  Boxes,
  HelpCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { reportService } from '@/services/api/reportService'
import { exportToCsv } from '@/utils/exportCsv'
import { formatCurrency } from '@/utils/formatters'

export const ReportsPage: React.FC = () => {
  const [periodRange, setPeriodRange] = React.useState<
    'today' | 'this_week' | 'this_month' | 'this_year'
  >('this_month')

  const { data: pnl, isLoading } = useQuery({
    queryKey: ['financial-report', periodRange],
    queryFn: () => reportService.getFinancialReport(periodRange),
  })

  const { data: inventoryVal } = useQuery({
    queryKey: ['inventory-valuation-report'],
    queryFn: () => reportService.getInventoryReport(),
  })

  const handleExportCsv = () => {
    if (!pnl) return
    exportToCsv(`financial_report_${periodRange}`, [pnl], [
      { header: 'Reporting Period', key: 'period' },
      { header: 'Sales Revenue ($)', key: 'salesRevenue' },
      { header: 'Cost of Goods Sold ($)', key: 'costOfGoodsSold' },
      { header: 'Gross Profit ($)', key: 'grossProfit' },
      { header: 'Gross Margin (%)', key: 'grossMarginPercentage' },
      { header: 'Discounts Given ($)', key: 'discountsGiven' },
      { header: 'Refunds Processed ($)', key: 'refundsProcessed' },
      { header: 'Operating Expenses ($)', key: 'recordedOperatingExpenses' },
      { header: 'Net Operating Result ($)', key: 'netOperatingResult' },
      { header: 'Transactions Count', key: 'transactionCount' },
    ])
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports, P&L Statements & Financial Analytics"
        description="Comprehensive store financial statements, Cost of Goods Sold (COGS), operating expenses, and net operating formula"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="h-4 w-4 mr-1.5" />
              Export P&L to CSV
            </Button>
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1.5" />
              Print-Friendly Report
            </Button>
          </div>
        }
      />

      {/* Reporting Period Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#16A34A]" />
            <span className="text-xs font-semibold text-[#334155] dark:text-[#9CA3AF]">
              Active Reporting Period:
            </span>
            <Badge variant="primary">{pnl?.period || 'THIS MONTH'}</Badge>
          </div>

          <div className="inline-flex rounded-lg border border-[#E2E8F0] dark:border-[#374151] p-0.5 text-xs">
            {(['today', 'this_week', 'this_month', 'this_year'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setPeriodRange(r)}
                className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                  periodRange === r
                    ? 'bg-[#16A34A] text-white font-bold shadow-xs'
                    : 'text-[#64748B] dark:text-[#9CA3AF] hover:text-[#111827]'
                }`}
              >
                {r.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sales Revenue"
          value={formatCurrency(pnl?.salesRevenue || 0)}
          description={`${pnl?.transactionCount || 0} checkout transactions`}
          icon={DollarSign}
          iconColor="text-[#16A34A] bg-blue-100 dark:bg-blue-950 dark:text-[#84CC16]"
        />
        <StatCard
          title="Cost of Goods Sold (COGS)"
          value={formatCurrency(pnl?.costOfGoodsSold || 0)}
          description="Wholesale merchandise cost"
          icon={FileSpreadsheet}
          iconColor="text-[#64748B] bg-[#F1F5F9] dark:bg-[#374151] dark:text-[#9CA3AF]"
        />
        <StatCard
          title="Gross Operating Profit"
          value={formatCurrency(pnl?.grossProfit || 0)}
          description={`Gross Margin: ${pnl?.grossMarginPercentage || 0}%`}
          trend={{ value: `${pnl?.grossMarginPercentage || 0}%`, isPositive: true }}
          icon={TrendingUp}
          iconColor="text-emerald-600 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400"
        />
        <StatCard
          title="Net Operating Result"
          value={formatCurrency(pnl?.netOperatingResult || 0)}
          description="Gross Profit minus Operating Expenses"
          trend={{
            value: (pnl?.netOperatingResult || 0) >= 0 ? 'Profitable' : 'Deficit',
            isPositive: (pnl?.netOperatingResult || 0) >= 0,
          }}
          icon={DollarSign}
          iconColor={
            (pnl?.netOperatingResult || 0) >= 0
              ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400'
              : 'text-red-600 bg-red-100 dark:bg-red-950 dark:text-red-400'
          }
        />
      </div>

      {/* Documented Formula Banner */}
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-start gap-3">
        <HelpCircle className="h-5 w-5 text-[#16A34A] shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-bold text-blue-900 dark:text-blue-300">
            Documented Accounting Formula:
          </p>
          <code className="text-[#1E293B] dark:text-[#F9FAFB] font-mono font-semibold block mt-1">
            Net Operating Result = (Sales Revenue - Cost of Goods Sold) - Recorded Operating Expenses
          </code>
          <p className="text-[#64748B] dark:text-[#9CA3AF] mt-1">
            Current Calculation: (${(pnl?.salesRevenue ?? 0).toFixed(2)} - ${(pnl?.costOfGoodsSold ?? 0).toFixed(2)}) - ${(pnl?.recordedOperatingExpenses ?? 0).toFixed(2)} ={' '}
            <strong className="text-blue-700 dark:text-blue-300">
              ${(pnl?.netOperatingResult ?? 0).toFixed(2)}
            </strong>
          </p>
        </div>
      </div>

      {/* Detailed Financial Statement Table */}
      <Card>
        <CardHeader>
          <CardTitle>Formal Profit & Loss Statement ({pnl?.period})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#374151]">
              <tr className="bg-[#F8FAFC] dark:bg-[#1F2937]/60 font-bold text-[#1E293B] dark:text-[#F9FAFB]">
                <td className="py-3 px-6">1. REVENUE FROM SALES</td>
                <td className="py-3 px-6 text-right font-mono">
                  {formatCurrency(pnl?.salesRevenue || 0)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-6 pl-12 text-[#64748B] dark:text-[#9CA3AF]">
                  Gross Merchandise Checkout Volume
                </td>
                <td className="py-2.5 px-6 text-right font-mono">
                  {formatCurrency(pnl?.salesRevenue || 0)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-6 pl-12 text-[#64748B] dark:text-[#9CA3AF]">
                  Discounts Given to Customers
                </td>
                <td className="py-2.5 px-6 text-right font-mono text-emerald-600">
                  -{formatCurrency(pnl?.discountsGiven || 0)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-6 pl-12 text-[#64748B] dark:text-[#9CA3AF]">
                  Approved Sales Returns / Refunds
                </td>
                <td className="py-2.5 px-6 text-right font-mono text-red-600">
                  -{formatCurrency(pnl?.refundsProcessed || 0)}
                </td>
              </tr>

              <tr className="bg-[#F8FAFC] dark:bg-[#1F2937]/60 font-bold text-[#1E293B] dark:text-[#F9FAFB]">
                <td className="py-3 px-6">2. COST OF GOODS SOLD (COGS)</td>
                <td className="py-3 px-6 text-right font-mono text-red-600">
                  -{formatCurrency(pnl?.costOfGoodsSold || 0)}
                </td>
              </tr>

              <tr className="bg-emerald-50/60 dark:bg-emerald-950/20 font-bold text-emerald-900 dark:text-emerald-300">
                <td className="py-3.5 px-6">3. GROSS PROFIT (Revenue - COGS)</td>
                <td className="py-3.5 px-6 text-right font-mono text-sm">
                  {formatCurrency(pnl?.grossProfit || 0)}
                </td>
              </tr>

              <tr className="bg-[#F8FAFC] dark:bg-[#1F2937]/60 font-bold text-[#1E293B] dark:text-[#F9FAFB]">
                <td className="py-3 px-6">4. RECORDED OPERATING EXPENSES</td>
                <td className="py-3 px-6 text-right font-mono text-red-600">
                  -{formatCurrency(pnl?.recordedOperatingExpenses || 0)}
                </td>
              </tr>

              <tr className="bg-[#16A34A] text-white font-bold text-sm">
                <td className="py-4 px-6">5. NET OPERATING RESULT (BOTTOM LINE)</td>
                <td className="py-4 px-6 text-right font-mono text-base">
                  {formatCurrency(pnl?.netOperatingResult || 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
