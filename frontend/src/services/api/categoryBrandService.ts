import api from './client'
import type { Category, Brand } from '@/types'
import { localStore } from '../dataStore'

export const categoryBrandService = {
  async getCategories(): Promise<Category[]> {
    try {
      const res = await api.get<any>('/categories')
      const raw = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : [])
      return raw.map((c: any) => ({
        id: c._id || c.id,
        name: c.name,
        code: c.code,
        description: c.description || '',
        productCount: c.productCount ?? 0,
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      }))
    } catch {
      return localStore.categories
    }
  },

  async createCategory(data: { name: string; code: string; description?: string }): Promise<Category> {
    const res = await api.post<any>('/categories', data)
    const c = res.data?.data || res.data
    return {
      id: c._id || c.id,
      name: c.name,
      code: c.code,
      description: c.description || '',
      productCount: 0,
      createdAt: new Date().toISOString(),
    }
  },

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    const payload: any = { ...data }
    delete payload.id
    delete payload.createdAt
    delete payload.productCount

    const res = await api.patch<any>('/categories/' + id, payload)
    const c = res.data?.data || res.data
    return {
      id: c._id || c.id,
      name: c.name,
      code: c.code,
      description: c.description || '',
      productCount: c.productCount ?? 0,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    }
  },

  async deleteCategory(id: string): Promise<void> {
    await api.delete('/categories/' + id)
  },

  async getBrands(): Promise<Brand[]> {
    try {
      const res = await api.get<any>('/brands')
      const raw = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : [])
      return raw.map((b: any) => ({
        id: b._id || b.id,
        name: b.name,
        code: b.code || b.name.slice(0, 4).toUpperCase(),
        description: b.description || '',
        productCount: b.productCount ?? 0,
        createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
      }))
    } catch {
      return localStore.brands
    }
  },

  async createBrand(data: { name: string; code?: string; description?: string }): Promise<Brand> {
    const res = await api.post<any>('/brands', data)
    const b = res.data?.data || res.data
    return {
      id: b._id || b.id,
      name: b.name,
      code: b.code || b.name.slice(0, 4).toUpperCase(),
      description: b.description || '',
      productCount: 0,
      createdAt: new Date().toISOString(),
    }
  },

  async updateBrand(id: string, data: Partial<Brand>): Promise<Brand> {
    const payload: any = { ...data }
    delete payload.id
    delete payload.createdAt
    delete payload.productCount

    const res = await api.patch<any>('/brands/' + id, payload)
    const b = res.data?.data || res.data
    return {
      id: b._id || b.id,
      name: b.name,
      code: b.code || b.name.slice(0, 4).toUpperCase(),
      description: b.description || '',
      productCount: b.productCount ?? 0,
      createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
    }
  },

  async deleteBrand(id: string): Promise<void> {
    await api.delete('/brands/' + id)
  },
}
