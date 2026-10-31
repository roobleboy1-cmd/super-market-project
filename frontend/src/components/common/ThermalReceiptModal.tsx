import * as React from 'react'
import { Printer, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/utils/formatters'
import type { Sale } from '@/types'
import { localStore } from '@/services/dataStore'

interface ThermalReceiptModalProps {
  sale: Sale | null
  open: boolean
  onClose: () => void
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({ sale, open, onClose }) => {
  const [paperWidth, setPaperWidth] = React.useState<'58mm' | '80mm'>('80mm')
  const settings = localStore.settings

  if (!open || !sale) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-[#111827]/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#1F2937] border border-[#E2E8F0] dark:border-[#374151] shadow-2xl p-6 z-10 flex flex-col max-h-[95vh]">
        {/* Modal Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#374151]">
          <div>
            <h3 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
              Thermal Receipt Print Preview
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#9CA3AF]">Invoice: {sale.invoiceNumber}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-[#E2E8F0] dark:border-[#374151] p-0.5 text-xs bg-[#F8FAFC] dark:bg-[#374151]">
              <button
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  paperWidth === '58mm'
                    ? 'bg-gradient-to-r from-[#16A34A] to-[#166534] text-white shadow-sm'
                    : 'text-[#64748B] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
                }`}
              >
                58 mm
              </button>
              <button
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  paperWidth === '80mm'
                    ? 'bg-gradient-to-r from-[#16A34A] to-[#166534] text-white shadow-sm'
                    : 'text-[#64748B] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
                }`}
              >
                80 mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#111827] dark:text-[#9CA3AF] dark:hover:text-[#F8FAFC] hover:bg-[#F1F5F9] dark:hover:bg-[#374151]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="overflow-y-auto py-4 flex justify-center bg-[#F1F5F9] dark:bg-[#111827] rounded-xl my-3 p-4 border border-[#E2E8F0] dark:border-[#374151]">
          <div
            className={`printable-receipt-area bg-white text-[#111827] p-4 font-mono text-[11px] leading-relaxed shadow-md border border-[#E2E8F0] ${
              paperWidth === '58mm' ? 'w-[240px]' : 'w-[320px]'
            }`}
          >
            {/* Header */}
            <div className="text-center pb-2 border-b border-dashed border-slate-400">
              <h2 className="text-sm font-bold uppercase tracking-wider">{settings.storeName}</h2>
              <p className="text-[10px] text-[#64748B]">{settings.address}</p>
              <p className="text-[10px] text-[#64748B]">Tel: {settings.phone}</p>
              <p className="text-[10px] text-[#64748B]">Tax/VAT No: {settings.taxNumber}</p>
              <p className="mt-1 text-[10px] whitespace-pre-line">{settings.receiptHeader}</p>
            </div>

            {/* Meta info */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Receipt:</span>
                <span className="font-bold">{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{formatDate(sale.createdAt, true)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{sale.cashierName}</span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{sale.customerName}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="py-2 border-b border-dashed border-slate-400">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-300 text-[10px]">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Price</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-[#E2E8F0]">
                      <td className="py-1 truncate max-w-[110px]" title={item.productName || item.name}>
                        {item.productName || item.name}
                      </td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right">{item.unitPrice.toFixed(2)}</td>
                      <td className="py-1 text-right font-medium">
                        {(item.quantity * item.unitPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-slate-400">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(sale.subtotal, settings.currency)}</span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span>-{formatCurrency(sale.discountAmount, settings.currency)}</span>
                </div>
              )}
              {sale.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>Tax/VAT:</span>
                  <span>{formatCurrency(sale.taxAmount, settings.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-300">
                <span>TOTAL:</span>
                <span>{formatCurrency(sale.total, settings.currency)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
              {sale.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>Payment ({p.method}):</span>
                  <span>{formatCurrency(p.amount, settings.currency)}</span>
                </div>
              ))}
              {sale.cashReceived && (
                <div className="flex justify-between">
                  <span>Cash Tendered:</span>
                  <span>{formatCurrency(sale.cashReceived, settings.currency)}</span>
                </div>
              )}
              {sale.changeDue !== undefined && (
                <div className="flex justify-between font-bold">
                  <span>Change Given:</span>
                  <span>{formatCurrency(sale.changeDue, settings.currency)}</span>
                </div>
              )}
            </div>

            {/* Barcode representation */}
            <div className="pt-3 text-center">
              <div className="inline-block tracking-widest font-mono text-[11px] border border-slate-800 px-3 py-1 bg-[#F8FAFC] font-bold">
                *{sale.invoiceNumber}*
              </div>
              <p className="mt-2 text-[9px] text-[#64748B] whitespace-pre-line leading-tight">
                {settings.receiptFooter}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt ({paperWidth})
          </Button>
        </div>
      </div>
    </div>
  )
}
