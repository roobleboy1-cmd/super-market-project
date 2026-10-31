import api from './client'
import type { Supplier } from '@/types'
import { localStore } from '../dataStore'

export const supplierService = {
  async getSuppliers(): Promise<Supplier[]> {
    try {
      const res = await api.get<any>('/suppliers')
      const raw = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : [])
      return raw.map((s: any) => ({
        id: s._id || s.id,
        name: s.companyName || s.name,
        contactPerson: s.name,
        phone: s.phone,
        email: s.email || '',
        address: s.address || '',
        taxId: s.taxNumber || '',
        paymentTerms: s.paymentTerms || 'Net 30',
        currentBalance: s.balance ?? s.currentBalance ?? 0,
        status: s.isActive === false ? 'inactive' : 'active',
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
      }))
    } catch {
      return localStore.suppliers
    }
  },

  async getSupplierById(id: string): Promise<Supplier> {
    try {
      const res = await api.get<any>('/suppliers/' + id)
      const s = res.data?.data || res.data
      return {
        id: s._id || s.id,
        name: s.companyName || s.name,
        contactPerson: s.name,
        phone: s.phone,
        email: s.email || '',
        address: s.address || '',
        taxId: s.taxNumber || '',
        paymentTerms: s.paymentTerms || 'Net 30',
        currentBalance: s.balance ?? s.currentBalance ?? 0,
        status: s.isActive === false ? 'inactive' : 'active',
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
      }
    } catch {
      const sup = localStore.suppliers.find((s) => s.id === id)
      if (!sup) throw new Error('Supplier not found')
      return sup
    }
  },

  async createSupplier(data: Omit<Supplier, 'id' | 'createdAt' | 'currentBalance'>): Promise<Supplier> {
    try {
      const res = await api.post<any>('/suppliers', {
        name: data.contactPerson || data.name,
        companyName: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        paymentTerms: data.paymentTerms,
      })
      const s = res.data?.data || res.data
      return {
        id: s._id || s.id,
        name: s.companyName || s.name,
        contactPerson: s.name,
        phone: s.phone,
        email: s.email || '',
        address: s.address || '',
        paymentTerms: s.paymentTerms || 'Net 30',
        currentBalance: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
      }
    } catch {
      const newSup: Supplier = {
        ...data,
        id: 'sup-' + Date.now(),
        currentBalance: 0,
        createdAt: new Date().toISOString(),
      }
      localStore.suppliers.push(newSup)
      return newSup
    }
  },

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    try {
      const res = await api.put<any>('/suppliers/' + id, data)
      const s = res.data?.data || res.data
      return {
        id: s._id || s.id,
        name: s.companyName || s.name,
        contactPerson: s.name,
        phone: s.phone,
        email: s.email || '',
        address: s.address || '',
        paymentTerms: s.paymentTerms || 'Net 30',
        currentBalance: s.balance ?? 0,
        status: 'active',
        createdAt: new Date().toISOString(),
      }
    } catch {
      const idx = localStore.suppliers.findIndex((s) => s.id === id)
      if (idx === -1) throw new Error('Supplier not found')
      const updated = { ...localStore.suppliers[idx], ...data }
      localStore.suppliers[idx] = updated
      return updated
    }
  },

  async deleteSupplier(id: string): Promise<void> {
    try {
      await api.delete('/suppliers/' + id)
    } catch {
      const idx = localStore.suppliers.findIndex((s) => s.id === id)
      if (idx !== -1) localStore.suppliers.splice(idx, 1)
    }
  },
}
