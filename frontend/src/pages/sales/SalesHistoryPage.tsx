import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Receipt,
  Search,
  Printer,
  Ban,
  RotateCcw,
  Eye,
  Filter,
  CreditCard,
  DollarSign,
  Smartphone,
} from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { ThermalReceiptModal } from '@/components/common/ThermalReceiptModal'
import { salesService } from '@/services/api/salesService'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate } from '@/utils/formatters'
import type { Sale } from '@/types'

export const SalesHistoryPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { success, error } = useToast()

  const [search, setSearch] = React.useState('')
  const [paymentMethod, setPaymentMethod] = React.useState('all')
  const [selectedSaleForDetails, setSelectedSaleForDetails] = React.useState<Sale | null>(null)
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = React.useState<Sale | null>(null)
  const [voidDialogOpen, setVoidDialogOpen] = React.useState(false)
  const [saleToVoid, setSaleToVoid] = React.useState<Sale | null>(null)
  const [voidReason, setVoidReason] = React.useState('')

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', { search, paymentMethod }],
    queryFn: () => salesService.getSales({ search, paymentMethod }),
  })

  // Handle Void
  const handleConfirmVoid = async () => {
    if (!saleToVoid || !voidReason.trim()) return
    try {
      await salesService.voidSale(saleToVoid.id, voidReason, user?.name || 'Manager')
      success('Sale Voided & Cancelled', `${saleToVoid.invoiceNumber} inventory reverted`)
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setVoidDialogOpen(false)
      setSaleToVoid(null)
      setVoidReason('')
    } catch (err: any) {
      error('Void Failed', err.message)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Ledger & Completed Transactions"
        description="Comprehensive point-of-sale receipt journal, payment verification, receipt reprints, and manager void workflows"
      />

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search invoice number, cashier, customer phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#374151] bg-white dark:bg-[#1F2937]"
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-[#374151] bg-white dark:bg-[#1F2937]"
              >
                <option value="all">All Payment Methods</option>
                <option value="Cash">Cash</option>
                <option value="EVC Plus">EVC Plus</option>
                <option value="eDahab">eDahab</option>
                <option value="ZAAD">ZAAD</option>
                <option value="Card">Card</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales History Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] dark:bg-[#111827]/40 text-[#64748B] border-b border-[#E2E8F0] dark:border-[#374151] uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#374151]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#94A3B8]">
                    Loading sales records...
                  </td>
                </tr>
              ) : salesData?.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#94A3B8]">
                    No sales found matching this filter.
                  </td>
                </tr>
              ) : (
                salesData?.items.map((sale) => (
                  <tr key={sale.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#374151]/40">
                    <td className="py-3 px-4 font-mono font-bold text-[#111827] dark:text-[#F9FAFB]">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">
                      {formatDate(sale.createdAt, true)}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#1E293B] dark:text-[#F9FAFB]">
                      {sale.cashierName}
                    </td>
                    <td className="py-3 px-4">
                      {sale.customerName ? (
                        <div>
                          <div className="font-semibold text-[#111827] dark:text-[#F9FAFB]">
                            {sale.customerName}
                          </div>
                          <div className="text-[10px] text-[#94A3B8]">{sale.customerPhone}</div>
                        </div>
                      ) : (
                        <span className="text-[#94A3B8] italic">Walk-in Customer</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {sale.payments.map((p, idx) => (
                          <Badge key={idx} variant="primary" size="sm">
                            {p.method}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#111827] dark:text-[#F9FAFB]">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant={sale.paymentStatus === 'voided' ? 'danger' : 'success'}
                        size="sm"
                      >
                        {sale.paymentStatus.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedSaleForReceipt(sale)}
                          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#16A34A] hover:bg-[#F1F5F9] dark:hover:bg-[#374151]"
                          title="Reprint Receipt (58mm/80mm)"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setSelectedSaleForDetails(sale)}
                          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#16A34A] hover:bg-[#F1F5F9] dark:hover:bg-[#374151]"
                          title="View Itemized Breakdown"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {sale.paymentStatus !== 'voided' && (
                          <button
                            onClick={() => {
                              setSaleToVoid(sale)
                              setVoidDialogOpen(true)
                            }}
                            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-600 hover:bg-[#F1F5F9] dark:hover:bg-[#374151]"
                            title="Authorized Void Sale"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SALE DETAILS MODAL */}
      <Dialog
        open={!!selectedSaleForDetails}
        onClose={() => setSelectedSaleForDetails(null)}
        title={`Invoice Breakdown: ${selectedSaleForDetails?.invoiceNumber}`}
        maxWidth="lg"
      >
        {selectedSaleForDetails && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#374151]/40">
              <div>
                <span className="text-[#94A3B8] block">Cashier</span>
                <span className="font-bold text-[#111827] dark:text-[#F9FAFB]">
                  {selectedSaleForDetails.cashierName}
                </span>
              </div>
              <div>
                <span className="text-[#94A3B8] block">Date</span>
                <span className="font-bold text-[#111827] dark:text-[#F9FAFB]">
                  {formatDate(selectedSaleForDetails.createdAt, true)}
                </span>
              </div>
              <div>
                <span className="text-[#94A3B8] block">Customer</span>
                <span className="font-bold text-[#111827] dark:text-[#F9FAFB]">
                  {selectedSaleForDetails.customerName || 'Walk-in'}
                </span>
              </div>
              <div>
                <span className="text-[#94A3B8] block">Status</span>
                <Badge variant={selectedSaleForDetails.paymentStatus === 'voided' ? 'danger' : 'success'}>
                  {selectedSaleForDetails.paymentStatus.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="border border-[#E2E8F0] dark:border-[#374151] rounded-lg overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#F8FAFC] dark:bg-[#1F2937] text-[#64748B] uppercase text-[10px]">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#374151]">
                  {selectedSaleForDetails.items.map((i, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-semibold text-[#111827] dark:text-[#F9FAFB]">
                        {i.productName || i.name}
                      </td>
                      <td className="p-2 text-center">{i.quantity}</td>
                      <td className="p-2 text-right">${i.unitPrice.toFixed(2)}</td>
                      <td className="p-2 text-right font-bold">${i.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#374151]/40 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${selectedSaleForDetails.subtotal.toFixed(2)}</span>
              </div>
              {selectedSaleForDetails.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-${selectedSaleForDetails.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm border-t border-[#E2E8F0] dark:border-[#374151] pt-1">
                <span>Total:</span>
                <span>${selectedSaleForDetails.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* VOID CONFIRMATION MODAL */}
      <Dialog
        open={voidDialogOpen}
        onClose={() => setVoidDialogOpen(false)}
        title="Authorize Sale Void / Cancellation"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 leading-relaxed">
            Voiding sale <strong>{saleToVoid?.invoiceNumber}</strong> (${saleToVoid?.total.toFixed(2)})
            will permanently cancel the receipt and return all items back into store inventory.
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-[#334155] dark:text-[#9CA3AF]">
              Reason for Voiding
            </label>
            <textarea
              required
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#374151] bg-white dark:bg-[#1F2937]"
              placeholder="e.g. Duplicate scan / customer cancelled payment after tender..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setVoidDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmVoid} disabled={!voidReason.trim()}>
              Confirm Void Sale
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Thermal Receipt Reprint Preview */}
      <ThermalReceiptModal
        sale={selectedSaleForReceipt}
        open={!!selectedSaleForReceipt}
        onClose={() => setSelectedSaleForReceipt(null)}
      />
    </div>
  )
}
