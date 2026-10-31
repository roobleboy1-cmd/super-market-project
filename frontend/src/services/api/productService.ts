import api from './client'
import type { Product, StockMovement, PaginatedResponse } from '@/types'
import { localStore } from '../dataStore'

export interface GetProductsParams {
  search?: string
  categoryId?: string
  brandId?: string
  status?: string
  lowStockOnly?: boolean
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function mapProductFromBackend(p: any): Product {
  const currentStock = p.currentStock ?? p.quantity ?? 0
  const minStock = p.minStockLevel ?? p.minStock ?? 5
  const status: Product['status'] = p.isArchived ? 'archived' : 'active'

  return {
    id: p._id || p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    description: p.description || '',
    categoryId: p.category?._id || p.category || p.categoryId || '',
    categoryName: p.category?.name || p.categoryName || '',
    brandId: p.brand?._id || p.brand || p.brandId || '',
    brandName: p.brand?.name || p.brandName || '',
    unit: p.unit?.symbol || p.unit?.name || p.unit || 'pcs',
    costPrice: p.costPrice ?? 0,
    sellingPrice: p.sellingPrice ?? 0,
    quantity: currentStock,
    minStockLevel: minStock,
    supplierId: p.defaultSupplier?._id || p.supplierId || '',
    supplierName: p.defaultSupplier?.companyName || p.defaultSupplier?.name || p.supplierName || '',
    trackExpiry: p.isExpiringProduct ?? p.trackExpiry ?? true,
    taxRate: p.taxRate ?? 5,
    imageUrl: p.imageUrl || '',
    status,
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
  }
}

export const productService = {
  async getProducts(params: GetProductsParams = {}): Promise<PaginatedResponse<Product>> {
    try {
      const res = await api.get<any>('/products', {
        params: {
          search: params.search,
          categoryId: params.categoryId !== 'all' ? params.categoryId : undefined,
          brandId: params.brandId !== 'all' ? params.brandId : undefined,
          page: params.page || 1,
          limit: params.pageSize || 100,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        }
      })
      const raw = res.data
      const rawItems = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : (raw?.items || []))
      const meta = raw?.meta || {}
      let items = rawItems.map(mapProductFromBackend)

      if (params.lowStockOnly) {
        items = items.filter((p: Product) => p.quantity <= p.minStockLevel)
      }
      if (params.status && params.status !== 'all') {
        items = items.filter((p: Product) => p.status === params.status)
      }

      return {
        items,
        total: meta.total ?? items.length,
        page: meta.page ?? (params.page || 1),
        pageSize: meta.limit ?? (params.pageSize || items.length),
        totalPages: meta.pages ?? Math.max(1, Math.ceil((meta.total ?? items.length) / (meta.limit ?? 100))),
      }
    } catch {
      let filtered = [...localStore.products]

      if (params.search) {
        const q = params.search.toLowerCase()
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.barcode.includes(q) ||
            p.categoryName?.toLowerCase().includes(q)
        )
      }

      if (params.categoryId && params.categoryId !== 'all') {
        filtered = filtered.filter((p) => p.categoryId === params.categoryId)
      }

      if (params.brandId && params.brandId !== 'all') {
        filtered = filtered.filter((p) => p.brandId === params.brandId)
      }

      if (params.status && params.status !== 'all') {
        filtered = filtered.filter((p) => p.status === params.status)
      }

      if (params.lowStockOnly) {
        filtered = filtered.filter((p) => p.quantity <= p.minStockLevel)
      }

      const sortBy = params.sortBy || 'name'
      const sortOrder = params.sortOrder || 'asc'
      filtered.sort((a: any, b: any) => {
        const aVal = a[sortBy] ?? ''
        const bVal = b[sortBy] ?? ''
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
        return 0
      })

      const page = params.page || 1
      const pageSize = params.pageSize || 10
      const total = filtered.length
      const totalPages = Math.ceil(total / pageSize)
      const start = (page - 1) * pageSize
      const items = filtered.slice(start, start + pageSize)

      return {
        items,
        total,
        page,
        pageSize,
        totalPages,
      }
    }
  },

  async getProductById(id: string): Promise<Product> {
    try {
      const res = await api.get<any>('/products/' + id)
      return mapProductFromBackend(res.data?.data || res.data)
    } catch {
      const found = localStore.products.find((p) => p.id === id)
      if (!found) throw new Error('Product not found')
      return found
    }
  },

  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    try {
      const res = await api.post<any>('/products', data)
      return mapProductFromBackend(res.data?.data || res.data)
    } catch {
      const newProduct: Product = {
        ...data,
        id: 'prod-' + Date.now(),
        categoryName: localStore.categories.find((c) => c.id === data.categoryId)?.name,
        brandName: localStore.brands.find((b) => b.id === data.brandId)?.name,
        supplierName: localStore.suppliers.find((s) => s.id === data.supplierId)?.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      localStore.products.unshift(newProduct)
      return newProduct
    }
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    try {
      const res = await api.put<any>('/products/' + id, data)
      return mapProductFromBackend(res.data?.data || res.data)
    } catch {
      const index = localStore.products.findIndex((p) => p.id === id)
      if (index === -1) throw new Error('Product not found')
      const updated = {
        ...localStore.products[index],
        ...data,
        updatedAt: new Date().toISOString(),
      }
      localStore.products[index] = updated
      return updated
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      await api.delete('/products/' + id)
    } catch {
      const index = localStore.products.findIndex((p) => p.id === id)
      if (index !== -1) {
        localStore.products.splice(index, 1)
      }
    }
  },

  async importProductsCsv(rows: Record<string, string>[]): Promise<{ importedCount: number; errors: string[] }> {
    try {
      const res = await api.post<any>('/products/import', { rows })
      return res.data?.data || res.data
    } catch {
      return { importedCount: 0, errors: [] }
    }
  },

  async getMovements(productId: string): Promise<StockMovement[]> {
    try {
      const res = await api.get<any>('/products/' + productId + '/movements')
      return res.data?.data || res.data || []
    } catch {
      return localStore.stockMovements.filter((m) => m.productId === productId)
    }
  },
}
