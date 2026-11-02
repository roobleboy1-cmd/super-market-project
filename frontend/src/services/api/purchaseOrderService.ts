import api from './client'
import type { PurchaseOrder, POLineItem } from '@/types'
import { localStore } from '../dataStore'

export function mapPurchaseOrderFromBackend(p: any): PurchaseOrder {
  return {
    id: p._id || p.id,
    poNumber: p.purchaseOrderNumber || p.poNumber || 'PO-' + p._id,
    supplierId: p.supplierId?._id || p.supplierId || '',
    supplierName: p.supplierId?.companyName || p.supplierId?.name || p.supplierName || 'Supplier',
    status: (p.status === 'draft' ? 'ordered' : p.status) as any,
    items: (p.items || []).map((i: any) => ({
      productId: i.productId?._id || i.productId || '',
      productName: i.productName || i.name || 'Product',
      sku: i.sku || '',
      quantityOrdered: i.orderedQuantity ?? i.quantityOrdered ?? 0,
      quantityReceived: i.receivedQuantity ?? i.quantityReceived ?? 0,
      unitCost: i.unitCost ?? 0,
      subtotal: i.subtotal ?? (Number(i.orderedQuantity ?? i.quantityOrdered ?? 0) * Number(i.unitCost ?? 0)),
    })),
    totalAmount: p.grandTotal ?? p.totalAmount ?? 0,
    paidAmount: p.paidAmount ?? 0,
    paymentStatus: p.paymentStatus || 'unpaid',
    expectedDeliveryDate: p.expectedDeliveryDate ? new Date(p.expectedDeliveryDate).toISOString().slice(0, 10) : undefined,
    notes: p.notes,
    createdBy: p.createdBy?.name || p.createdBy || 'Staff User',
    receivedAt: p.receivedAt ? new Date(p.receivedAt).toISOString() : undefined,
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
  }
}

export const purchaseOrderService = {
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    try {
      const res = await api.get<any>('/purchases')
      const raw = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : [])
      return raw.map(mapPurchaseOrderFromBackend)
    } catch {
      return localStore.purchaseOrders
    }
  },

  async getPOById(id: string): Promise<PurchaseOrder> {
    try {
      const res = await api.get<any>(`/purchases/${id}`)
      const raw = res.data?.data || res.data
      return mapPurchaseOrderFromBackend(raw)
    } catch {
      const po = localStore.purchaseOrders.find((p) => p.id === id || p.poNumber === id)
      if (!po) throw new Error('Purchase order not found')
      return po
    }
  },

  async createPO(payload: {
    supplierId: string
    items: { productId: string; quantityOrdered: number; unitCost: number }[]
    expectedDeliveryDate?: string
    notes?: string
    createdBy: string
  }): Promise<PurchaseOrder> {
    const backendItems = payload.items.map((i) => ({
      productId: i.productId,
      orderedQuantity: Number(i.quantityOrdered) || 1,
      unitCost: Number(i.unitCost) || 0,
      taxRate: 0,
    }))

    const body: any = {
      supplierId: payload.supplierId,
      items: backendItems,
      notes: payload.notes,
    }

    if (payload.expectedDeliveryDate) {
      body.expectedDeliveryDate = new Date(payload.expectedDeliveryDate).toISOString()
    }

    const res = await api.post<any>('/purchases', body)
    const raw = res.data?.data || res.data
    return mapPurchaseOrderFromBackend(raw)
  },

  async receivePOItems(
    poId: string,
    receivedQuantities: { productId: string; quantityReceivedNow: number }[],
    receivedBy: string
  ): Promise<PurchaseOrder> {
    const receivedItems = receivedQuantities.map((r) => ({
      productId: r.productId,
      receivedQuantity: Number(r.quantityReceivedNow) || 0,
      batchNumber: `BATCH-${Date.now().toString().slice(-6)}`,
    }))

    const res = await api.post<any>(`/purchases/${poId}/receive`, {
      receivedItems,
      receivedQuantities: receivedItems,
      receivedBy,
    })
    const raw = res.data?.data || res.data
    return mapPurchaseOrderFromBackend(raw)
  },

  async cancelPO(poId: string, cancelledBy: string, reason: string): Promise<PurchaseOrder> {
    const res = await api.post<any>(`/purchases/${poId}/cancel`, { cancelledBy, reason })
    const raw = res.data?.data || res.data
    return mapPurchaseOrderFromBackend(raw)
  },
}
