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
    try {
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
    } catch {
      const newCat: Category = {
        id: 'cat-' + Date.now(),
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description,
        productCount: 0,
        createdAt: new Date().toISOString(),
      }
      localStore.categories.push(newCat)
      return newCat
    }
  },

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    try {
      const res = await api.put<any>('/categories/' + id, data)
      const c = res.data?.data || res.data
      return {
        id: c._id || c.id,
        name: c.name,
        code: c.code,
        description: c.description || '',
        productCount: c.productCount ?? 0,
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      }
    } catch {
      const idx = localStore.categories.findIndex((c) => c.id === id)
      if (idx === -1) throw new Error('Category not found')
      const updated = { ...localStore.categories[idx], ...data }
      localStore.categories[idx] = updated
      return updated
    }
  },

  async deleteCategory(id: string): Promise<void> {
    try {
      await api.delete('/categories/' + id)
    } catch {
      const idx = localStore.categories.findIndex((c) => c.id === id)
      if (idx !== -1) localStore.categories.splice(idx, 1)
    }
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
    try {
      const res = await api.post<any>('/brands', data)
      const b = res.data?.data || res.data
      return {
        id: b._id || b.id,
        name: b.name,
        code: b.code || data.code || b.name.slice(0, 4).toUpperCase(),
        description: b.description || '',
        productCount: 0,
        createdAt: new Date().toISOString(),
      }
    } catch {
      const newBrand: Brand = {
        id: 'brand-' + Date.now(),
        name: data.name,
        code: data.code || data.name.slice(0, 4).toUpperCase(),
        description: data.description,
        productCount: 0,
        createdAt: new Date().toISOString(),
      }
      localStore.brands.push(newBrand)
      return newBrand
    }
  },

  async updateBrand(id: string, data: Partial<Brand>): Promise<Brand> {
    try {
      const res = await api.put<any>('/brands/' + id, data)
      const b = res.data?.data || res.data
      return {
        id: b._id || b.id,
        name: b.name,
        code: b.code || b.name.slice(0, 4).toUpperCase(),
        description: b.description || '',
        productCount: b.productCount ?? 0,
        createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
      }
    } catch {
      const idx = localStore.brands.findIndex((b) => b.id === id)
      if (idx === -1) throw new Error('Brand not found')
      const updated = { ...localStore.brands[idx], ...data }
      localStore.brands[idx] = updated
      return updated
    }
  },

  async deleteBrand(id: string): Promise<void> {
    try {
      await api.delete('/brands/' + id)
    } catch {
      const idx = localStore.brands.findIndex((b) => b.id === id)
      if (idx !== -1) localStore.brands.splice(idx, 1)
    }
  },
}
