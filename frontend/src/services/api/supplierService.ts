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
    const res = await api.post<any>('/suppliers', {
      name: data.contactPerson || data.name,
      companyName: data.name,
      email: data.email || undefined,
      phone: data.phone,
      address: data.address || undefined,
      taxNumber: data.taxId || undefined,
      paymentTerms: data.paymentTerms || 'Net 30',
    })
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
      currentBalance: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    }
  },

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    const payload: any = { ...data }
    if (data.name) payload.companyName = data.name
    if (data.contactPerson) payload.name = data.contactPerson
    if (data.taxId !== undefined) payload.taxNumber = data.taxId
    delete payload.id
    delete payload.currentBalance
    delete payload.createdAt

    const res = await api.patch<any>('/suppliers/' + id, payload)
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
      currentBalance: s.balance ?? 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    }
  },

  async deleteSupplier(id: string): Promise<void> {
    await api.delete('/suppliers/' + id)
  },
}
