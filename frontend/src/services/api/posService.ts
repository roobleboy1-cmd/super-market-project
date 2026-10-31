import api from './client'
import type { Sale, CartItem, PaymentSplit, QueuedTransaction } from '@/types'
import { localStore } from '../dataStore'
import { generateInvoiceNumber } from '@/utils/formatters'

export interface CheckoutPayload {
  items: CartItem[]
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  payments: PaymentSplit[]
  cashReceived?: number
  changeDue?: number
  customerId?: string
  customerName?: string
  customerPhone?: string
  cashierId: string
  cashierName: string
  shiftId: string
  notes?: string
  idempotencyKey?: string
}

/* Map frontend payment method names → backend enum values */
function toBackendPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    'Cash': 'CASH',
    'Card': 'CARD',
    'EVC Plus': 'EVC_PLUS',
    'eDahab': 'EDAHAB',
    'ZAAD': 'ZAAD',
    'Bank Transfer': 'BANK_TRANSFER',
  }
  return map[method] || method.toUpperCase()
}

export const posService = {
  async checkout(payload: CheckoutPayload): Promise<Sale> {
    // FEFO check & expired stock check
    for (const item of payload.items) {
      const prod = localStore.products.find((p) => p.id === item.productId)
      if (prod && prod.trackExpiry) {
        const expiredBatch = localStore.batches.find(
          (b) => b.productId === prod.id && b.status === 'expired' && b.currentQuantity > 0
        )
        if (expiredBatch) {
          console.warn(`Enforcing FEFO: Skipping expired batch ${expiredBatch.batchNumber}`)
        }
      }
    }

    // Convert payment methods to backend format
    const backendPayments = payload.payments.map((p) => ({
      method: toBackendPaymentMethod(p.method),
      amount: p.amount,
      reference: p.reference,
    }))

    // Clean items payload for backend schema
    const backendItems = payload.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      discount: i.discount || 0,
    }))

    // Clean shiftId & customerId – only send if valid 24-hex ObjectId
    const cleanShiftId = /^[0-9a-fA-F]{24}$/.test(payload.shiftId) ? payload.shiftId : undefined
    const cleanCustomerId = payload.customerId && /^[0-9a-fA-F]{24}$/.test(payload.customerId) ? payload.customerId : undefined

    try {
      const res = await api.post<any>('/pos/checkout', {
        items: backendItems,
        payments: backendPayments,
        shiftId: cleanShiftId,
        customerId: cleanCustomerId,
        notes: payload.notes,
        idempotencyKey: payload.idempotencyKey,
      }, {
        headers: payload.idempotencyKey ? { 'Idempotency-Key': payload.idempotencyKey } : {},
      })

      const raw = res.data?.data || res.data
      const sale: Sale = {
        id: raw._id || raw.id,
        invoiceNumber: raw.receiptNumber || raw.invoiceNumber || 'INV-' + (raw._id || Date.now()),
        cashierId: raw.cashierId?._id || raw.cashierId || payload.cashierId,
        cashierName: raw.cashierId?.name || payload.cashierName,
        customerId: raw.customerId?._id || raw.customerId,
        customerName: raw.customerId?.name || payload.customerName,
        customerPhone: raw.customerId?.phone || payload.customerPhone,
        items: (raw.items && raw.items.length > 0 ? raw.items : payload.items).map((it: any, idx: number) => {
          const matchingCartItem = payload.items.find((p) => p.productId === (it.productId?._id || it.productId))
          return {
            id: it._id || it.id || matchingCartItem?.id || `item-${idx}`,
            productId: it.productId?._id || it.productId || matchingCartItem?.productId,
            name: it.productName || it.name || matchingCartItem?.name || 'Product',
            sku: it.sku || matchingCartItem?.sku || '',
            barcode: it.barcode || matchingCartItem?.barcode || '',
            unitPrice: it.unitPrice ?? matchingCartItem?.unitPrice ?? 0,
            costPrice: it.costPrice ?? matchingCartItem?.costPrice ?? 0,
            quantity: it.quantity ?? matchingCartItem?.quantity ?? 1,
            discount: it.discount ?? matchingCartItem?.discount ?? 0,
            taxRate: it.taxRate ?? matchingCartItem?.taxRate ?? 0,
          }
        }),
        subtotal: raw.subtotal ?? payload.subtotal,
        discountAmount: raw.discountTotal ?? raw.discountAmount ?? payload.discountAmount,
        taxAmount: raw.taxTotal ?? raw.taxAmount ?? payload.taxAmount,
        total: raw.grandTotal ?? raw.total ?? payload.total,
        payments: (raw.payments && raw.payments.length > 0 ? raw.payments : payload.payments).map((p: any) => ({
          method: p.method === 'EVC_PLUS' ? 'EVC Plus' : p.method === 'EDAHAB' ? 'eDahab' : p.method === 'ZAAD' ? 'ZAAD' : p.method === 'CASH' ? 'Cash' : p.method === 'CARD' ? 'Card' : p.method,
          amount: p.amount,
          reference: p.reference,
        })),
        cashReceived: payload.cashReceived,
        changeDue: payload.changeDue,
        paymentStatus: raw.paymentStatus || 'paid',
        shiftId: raw.shiftId || payload.shiftId,
        notes: raw.notes || payload.notes,
        createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
      }

      return sale
    } catch (err: any) {
      // If server unreachable or error, throw real error message so cashier knows
      console.error('POS Checkout backend error:', err)
      throw new Error(err.response?.data?.message || err.message || 'Payment processing failed')
    }
  },

  async syncOfflineBatch(transactions: QueuedTransaction[]): Promise<{
    synchronizedKeys: string[]
    rejectedKeys: { key: string; error: string }[]
  }> {
    const res = await api.post('/sales/reconcile-offline', { transactions })
    return res.data?.data || res.data
  },
}
