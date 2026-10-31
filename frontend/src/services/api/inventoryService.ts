import api from './client'
import type {
  Product,
  StockAdjustment,
  BatchLot,
  PhysicalCount,
  ReorderRecommendation,
  AdjustmentReason,
} from '@/types'
import { localStore } from '../dataStore'

export const inventoryService = {
  async getOverview() {
    try {
      const res = await api.get('/inventory/overview')
      return res.data.data
    } catch {
      const products = localStore.products
      const totalItems = products.length
      const totalUnits = products.reduce((acc, p) => acc + p.quantity, 0)
      const totalValuation = products.reduce((acc, p) => acc + p.quantity * p.costPrice, 0)
      const potentialRevenue = products.reduce((acc, p) => acc + p.quantity * p.sellingPrice, 0)
      const lowStockCount = products.filter((p) => p.quantity > 0 && p.quantity <= p.minStockLevel).length
      const outOfStockCount = products.filter((p) => p.quantity === 0).length

      return {
        totalItems,
        totalUnits,
        totalValuation,
        potentialRevenue,
        expectedMargin: potentialRevenue - totalValuation,
        lowStockCount,
        outOfStockCount,
      }
    }
  },

  async adjustStock(payload: {
    productId: string
    type: 'increase' | 'decrease'
    quantity: number
    reason: AdjustmentReason
    notes?: string
    performedBy: string
  }): Promise<StockAdjustment> {
    try {
      const res = await api.post<{ data: StockAdjustment }>('/inventory/adjustments', payload)
      return res.data.data
    } catch {
      const prod = localStore.products.find((p) => p.id === payload.productId)
      if (!prod) throw new Error('Product not found')

      const prevQty = prod.quantity
      const change = payload.type === 'increase' ? payload.quantity : -payload.quantity
      const newQty = Math.max(0, prevQty + change)

      prod.quantity = newQty
      prod.updatedAt = new Date().toISOString()

      const adjustment: StockAdjustment = {
        id: `adj-${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        type: payload.type,
        quantity: payload.quantity,
        reason: payload.reason,
        notes: payload.notes,
        adjustedBy: payload.performedBy,
        createdAt: new Date().toISOString(),
      }
      localStore.stockAdjustments.unshift(adjustment)

      // Add movement record
      localStore.stockMovements.unshift({
        id: `sm-${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        type: 'adjustment',
        quantityChange: change,
        previousQty: prevQty,
        newQty,
        reason: payload.reason,
        referenceNo: adjustment.id,
        performedBy: payload.performedBy,
        createdAt: new Date().toISOString(),
      })

      localStore.logAction(
        payload.performedBy,
        'Inventory Manager',
        'STOCK_ADJUSTMENT',
        'Inventory',
        `Adjusted ${prod.name} by ${change > 0 ? '+' : ''}${change} (${payload.reason})`
      )

      return adjustment
    }
  },

  async getAdjustments(): Promise<StockAdjustment[]> {
    try {
      const res = await api.get<{ data: StockAdjustment[] }>('/inventory/adjustments')
      return res.data.data
    } catch {
      return localStore.stockAdjustments
    }
  },

  async getBatches(): Promise<BatchLot[]> {
    try {
      const res = await api.get<any>('/inventory/lots')
      const raw = res.data?.data || res.data || []
      const list = Array.isArray(raw) ? raw : (raw.lots || [])
      const now = new Date()
      return list.map((b: any) => {
        const exp = b.expirationDate ? new Date(b.expirationDate) : null
        const diffDays = exp ? (exp.getTime() - now.getTime()) / (1000 * 3600 * 24) : 999
        let status: BatchLot['status'] = 'active'
        if ((b.remainingQuantity ?? b.currentQuantity) <= 0) {
          status = 'depleted'
        } else if (diffDays < 0) {
          status = 'expired'
        } else if (diffDays <= 30) {
          status = 'near_expiry'
        }

        return {
          id: b._id || b.id,
          batchNumber: b.batchNumber,
          productId: b.productId?._id || b.productId || '',
          productName: b.productId?.name || b.productName || 'Product',
          sku: b.productId?.sku || b.sku || '',
          expiryDate: exp ? exp.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          receivedDate: b.receivedDate ? new Date(b.receivedDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          initialQuantity: b.quantityReceived ?? b.initialQuantity ?? 0,
          currentQuantity: b.remainingQuantity ?? b.currentQuantity ?? 0,
          costPrice: b.unitCost ?? b.costPrice ?? 0,
          supplierName: b.supplierId?.companyName || b.supplierId?.name || b.supplierName || 'Wholesale Supplier',
          status,
        }
      })
    } catch {
      const now = new Date()
      return localStore.batches.map((b) => {
        const exp = new Date(b.expiryDate)
        const diffDays = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24)
        let status: BatchLot['status'] = 'active'
        if (b.currentQuantity <= 0) {
          status = 'depleted'
        } else if (diffDays < 0) {
          status = 'expired'
        } else if (diffDays <= 30) {
          status = 'near_expiry'
        }
        return { ...b, status }
      })
    }
  },

  async createBatch(payload: Omit<BatchLot, 'id' | 'createdAt' | 'status'>): Promise<BatchLot> {
    try {
      const res = await api.post<{ data: BatchLot }>('/inventory/batches', payload)
      return res.data.data
    } catch {
      const prod = localStore.products.find((p) => p.id === payload.productId)
      const newBatch: BatchLot = {
        ...payload,
        id: `bat-${Date.now()}`,
        productName: prod?.name || payload.productName,
        status: 'active',
        createdAt: new Date().toISOString(),
      }
      localStore.batches.unshift(newBatch)
      return newBatch
    }
  },

  async disposeBatch(batchId: string, reason: string): Promise<void> {
    try {
      await api.post(`/inventory/batches/${batchId}/dispose`, { reason })
    } catch {
      const batch = localStore.batches.find((b) => b.id === batchId)
      if (batch) {
        const prod = localStore.products.find((p) => p.id === batch.productId)
        if (prod && batch.currentQuantity > 0) {
          const prev = prod.quantity
          prod.quantity = Math.max(0, prod.quantity - batch.currentQuantity)
          localStore.stockMovements.unshift({
            id: `sm-${Date.now()}`,
            productId: prod.id,
            productName: prod.name,
            type: 'damage',
            quantityChange: -batch.currentQuantity,
            previousQty: prev,
            newQty: prod.quantity,
            reason: `Disposed expired batch ${batch.batchNumber}: ${reason}`,
            performedBy: 'Staff',
            createdAt: new Date().toISOString(),
          })
        }
        batch.currentQuantity = 0
        batch.status = 'depleted'
      }
    }
  },

  async getPhysicalCounts(): Promise<PhysicalCount[]> {
    try {
      const res = await api.get<{ data: PhysicalCount[] }>('/inventory/counts')
      return res.data.data
    } catch {
      return localStore.physicalCounts
    }
  },

  async createPhysicalCount(notes: string, countedBy: string): Promise<PhysicalCount> {
    try {
      const res = await api.post<{ data: PhysicalCount }>('/inventory/counts', { notes, countedBy })
      return res.data.data
    } catch {
      const items = localStore.products.map((p) => ({
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        expectedQty: p.quantity,
        countedQty: p.quantity, // initially matching
        variance: 0,
        unitCost: p.costPrice,
        varianceValue: 0,
      }))

      const newAudit: PhysicalCount = {
        id: `cnt-${Date.now()}`,
        countReference: `AUD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        status: 'in_progress',
        totalItems: items.length,
        discrepancyCount: 0,
        totalVarianceValue: 0,
        countedBy,
        notes,
        items,
        createdAt: new Date().toISOString(),
      }
      localStore.physicalCounts.unshift(newAudit)
      return newAudit
    }
  },

  async reconcilePhysicalCount(id: string, items: { productId: string; countedQty: number }[]): Promise<PhysicalCount> {
    try {
      const res = await api.post<{ data: PhysicalCount }>(`/inventory/counts/${id}/reconcile`, { items })
      return res.data.data
    } catch {
      const audit = localStore.physicalCounts.find((c) => c.id === id)
      if (!audit) throw new Error('Audit count not found')

      let discrepancies = 0
      let totalVarianceValue = 0

      for (const item of items) {
        const line = audit.items.find((i) => i.productId === item.productId)
        const prod = localStore.products.find((p) => p.id === item.productId)
        if (line && prod) {
          line.countedQty = item.countedQty
          line.variance = item.countedQty - line.expectedQty
          line.varianceValue = line.variance * line.unitCost
          if (line.variance !== 0) {
            discrepancies++
            totalVarianceValue += line.varianceValue

            // Update inventory
            const prev = prod.quantity
            prod.quantity = item.countedQty
            localStore.stockMovements.unshift({
              id: `sm-${Date.now()}-${item.productId}`,
              productId: prod.id,
              productName: prod.name,
              type: 'audit',
              quantityChange: line.variance,
              previousQty: prev,
              newQty: item.countedQty,
              reason: `Reconciliation from audit ${audit.countReference}`,
              performedBy: audit.countedBy,
              createdAt: new Date().toISOString(),
            })
          }
        }
      }

      audit.discrepancyCount = discrepancies
      audit.totalVarianceValue = Math.round(totalVarianceValue * 100) / 100
      audit.status = 'reconciled'
      audit.completedAt = new Date().toISOString()
      return audit
    }
  },

  async getReorderRecommendations(): Promise<ReorderRecommendation[]> {
    try {
      const res = await api.get<{ data: ReorderRecommendation[] }>('/inventory/reorder-recommendations')
      return res.data.data
    } catch {
      const recommendations: ReorderRecommendation[] = []
      for (const prod of localStore.products) {
        if (prod.quantity <= prod.minStockLevel) {
          const avgDailySales = Math.max(1, Math.round(Math.random() * 5 + 1))
          const leadTimeDays = 5
          const safetyBuffer = prod.minStockLevel
          const suggestedReorderQty = avgDailySales * leadTimeDays * 2 + safetyBuffer - prod.quantity
          recommendations.push({
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            currentStock: prod.quantity,
            minStockLevel: prod.minStockLevel,
            avgDailySales,
            leadTimeDays,
            suggestedReorderQty: Math.max(10, suggestedReorderQty),
            supplierName: prod.supplierName || 'Primary FMCG Wholesale',
            supplierId: prod.supplierId || 'sup-1',
            estimatedCost: Math.max(10, suggestedReorderQty) * prod.costPrice,
          })
        }
      }
      return recommendations
    }
  },
}
