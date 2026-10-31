import api from './client'
import type { Sale, SalesReturn, ReturnItem } from '@/types'
import { localStore } from '../dataStore'

export interface GetSalesParams {
  search?: string
  cashierId?: string
  paymentMethod?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export const salesService = {
  async getSales(params: GetSalesParams = {}): Promise<{ items: Sale[]; total: number }> {
    try {
      const res = await api.get<any>('/sales', {
        params: {
          search: params.search,
          page: params.page || 1,
          limit: params.pageSize || 50,
          startDate: params.startDate,
          endDate: params.endDate,
        }
      })
      const raw = res.data
      const rawList = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : (raw?.items || []))
      const meta = raw?.meta || {}
      const items: Sale[] = rawList.map((s: any) => ({
        id: s._id || s.id,
        invoiceNumber: s.receiptNumber || s.invoiceNumber || 'INV-' + s._id,
        cashierId: s.cashierId?._id || s.cashierId || '',
        cashierName: s.cashierId?.name || s.cashierName || 'Cashier',
        customerId: s.customerId?._id || s.customerId,
        customerName: s.customerId?.name || s.customerName,
        customerPhone: s.customerId?.phone || s.customerPhone,
        items: (s.items || []).map((it: any) => ({
          productId: it.productId?._id || it.productId,
          productName: it.productName || it.name,
          sku: it.sku || '',
          barcode: it.barcode || '',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          costPrice: it.costPrice,
          discount: it.discount || 0,
          taxRate: it.taxRate || 0,
          total: it.total || (it.quantity * it.unitPrice),
        })),
        subtotal: s.subtotal,
        discountAmount: s.discountTotal ?? s.discountAmount ?? 0,
        taxAmount: s.taxTotal ?? s.taxAmount ?? 0,
        total: s.grandTotal ?? s.total ?? 0,
        payments: (s.payments || []).map((p: any) => ({
          method: p.method === 'EVC_PLUS' ? 'EVC Plus' : p.method === 'EDAHAB' ? 'eDahab' : p.method === 'ZAAD' ? 'ZAAD' : p.method === 'CASH' ? 'Cash' : 'Card',
          amount: p.amount,
          reference: p.reference,
        })),
        changeGiven: s.changeGiven || 0,
        paymentStatus: s.paymentStatus || 'paid',
        shiftId: s.shiftId || '',
        notes: s.notes,
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
      }))

      return {
        items,
        total: meta.total ?? items.length,
      }
    } catch {
      let filtered = [...localStore.sales]

      if (params.search) {
        const q = params.search.toLowerCase()
        filtered = filtered.filter(
          (s) =>
            s.invoiceNumber.toLowerCase().includes(q) ||
            s.cashierName.toLowerCase().includes(q) ||
            s.customerName?.toLowerCase().includes(q) ||
            s.customerPhone?.includes(q)
        )
      }

      if (params.cashierId && params.cashierId !== 'all') {
        filtered = filtered.filter((s) => s.cashierId === params.cashierId)
      }

      return {
        items: filtered,
        total: filtered.length,
      }
    }
  },

  async getSaleById(id: string): Promise<Sale> {
    try {
      const res = await api.get<any>('/sales/' + id)
      const s = res.data?.data || res.data
      return {
        id: s._id || s.id,
        invoiceNumber: s.receiptNumber || s.invoiceNumber,
        cashierId: s.cashierId?._id || s.cashierId,
        cashierName: s.cashierId?.name || s.cashierName || 'Cashier',
        customerId: s.customerId?._id || s.customerId,
        customerName: s.customerId?.name || s.customerName,
        items: s.items || [],
        subtotal: s.subtotal,
        discountAmount: s.discountTotal ?? s.discountAmount ?? 0,
        taxAmount: s.taxTotal ?? s.taxAmount ?? 0,
        total: s.grandTotal ?? s.total ?? 0,
        payments: s.payments || [],
        paymentStatus: s.paymentStatus || 'paid',
        shiftId: s.shiftId || '',
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
      }
    } catch {
      const s = localStore.sales.find((sale) => sale.id === id)
      if (!s) throw new Error('Sale not found')
      return s
    }
  },

  async voidSale(id: string, reason: string, authorizedBy: string): Promise<Sale> {
    try {
      const res = await api.post<any>('/sales/' + id + '/void', { reason, authorizedBy })
      return res.data?.data || res.data
    } catch {
      const sale = localStore.sales.find((s) => s.id === id)
      if (!sale) throw new Error('Sale not found')
      sale.paymentStatus = 'voided'
      sale.notes = 'Voided by ' + authorizedBy + ': ' + reason
      return sale
    }
  },

  async getReturns(): Promise<SalesReturn[]> {
    return localStore.returns
  },

  async createReturn(payload: {
    originalInvoiceNumber: string
    saleId: string
    items: any[]
    refundMethod?: any
    paymentMethod?: any
    refundAmount?: number
    requestedBy?: string
    inspectedBy?: string
    notes?: string
  }): Promise<SalesReturn> {
    const newReturn: SalesReturn = {
      id: 'ret-' + Date.now(),
      returnNumber: 'RET-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(10 + Math.random() * 90),
      saleId: payload.saleId,
      originalInvoiceNumber: payload.originalInvoiceNumber,
      items: payload.items.map((it: any) => ({
        productId: it.productId,
        productName: it.productName || 'Product',
        quantity: it.quantity,
        unitPrice: it.unitPrice || 1,
        refundAmount: (it.unitPrice || 1) * it.quantity,
        reason: it.reason || 'Other',
        returnToInventory: it.returnToInventory ?? true,
      })),
      totalRefundAmount: payload.refundAmount || 0,
      refundMethod: payload.refundMethod || payload.paymentMethod || 'Cash',
      refundStatus: 'pending_approval',
      inspectedBy: payload.inspectedBy || payload.requestedBy || 'Cashier Desk',
      notes: payload.notes,
      createdAt: new Date().toISOString(),
    }
    localStore.returns.unshift(newReturn)
    return newReturn
  },

  async approveRefund(returnId: string, approvedBy: string): Promise<SalesReturn> {
    const ret = localStore.returns.find((r) => r.id === returnId)
    if (!ret) throw new Error('Return not found')
    ret.refundStatus = 'completed'
    ret.approvedBy = approvedBy
    return ret
  },

  async rejectRefund(returnId: string, rejectedBy: string, reason: string): Promise<SalesReturn> {
    const ret = localStore.returns.find((r) => r.id === returnId)
    if (!ret) throw new Error('Return not found')
    ret.refundStatus = 'rejected'
    ret.approvedBy = rejectedBy
    ret.notes = reason
    return ret
  },
}
