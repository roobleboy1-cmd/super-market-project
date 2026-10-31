import api from './client'
import type { Customer, LoyaltyTransaction } from '@/types'
import { localStore } from '../dataStore'

export const customerService = {
  async getCustomers(search?: string): Promise<Customer[]> {
    try {
      const res = await api.get<any>('/customers', { params: { search } })
      const raw = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : [])
      return raw.map((c: any) => ({
        id: c._id || c.id,
        name: c.name,
        phone: c.phone,
        email: c.email || '',
        address: c.address || '',
        loyaltyPoints: c.loyaltyPoints ?? 0,
        tier: (c.loyaltyPoints >= 500 ? 'Platinum' : c.loyaltyPoints >= 300 ? 'Gold' : c.loyaltyPoints >= 100 ? 'Silver' : 'Standard') as any,
        totalSpent: c.totalSpent ?? 0,
        totalVisits: c.totalVisits ?? Math.max(1, Math.floor((c.totalSpent ?? 0) / 25)),
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      }))
    } catch {
      if (!search) return localStore.customers
      const q = search.toLowerCase()
      return localStore.customers.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email?.toLowerCase().includes(q)
      )
    }
  },

  async getCustomerById(id: string): Promise<Customer> {
    try {
      const res = await api.get<any>('/customers/' + id)
      const c = res.data?.data || res.data
      return {
        id: c._id || c.id,
        name: c.name,
        phone: c.phone,
        email: c.email || '',
        address: c.address || '',
        loyaltyPoints: c.loyaltyPoints ?? 0,
        tier: (c.loyaltyPoints >= 500 ? 'Platinum' : c.loyaltyPoints >= 300 ? 'Gold' : c.loyaltyPoints >= 100 ? 'Silver' : 'Standard') as any,
        totalSpent: c.totalSpent ?? 0,
        totalVisits: c.totalVisits ?? 1,
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      }
    } catch {
      const cust = localStore.customers.find((c) => c.id === id)
      if (!cust) throw new Error('Customer not found')
      return cust
    }
  },

  async createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'loyaltyPoints' | 'tier' | 'totalSpent' | 'totalVisits'>): Promise<Customer> {
    const payload: any = {
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      address: data.address || undefined,
    }
    const res = await api.post<any>('/customers', payload)
    const c = res.data?.data || res.data
    return {
      id: c._id || c.id,
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      loyaltyPoints: c.loyaltyPoints ?? 0,
      tier: 'Standard',
      totalSpent: c.totalSpent ?? 0,
      totalVisits: c.totalVisits ?? 0,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    }
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const payload: any = { ...data }
    delete payload.id
    delete payload.createdAt
    delete payload.totalSpent
    delete payload.totalVisits
    delete payload.tier

    const res = await api.patch<any>('/customers/' + id, payload)
    const c = res.data?.data || res.data
    return {
      id: c._id || c.id,
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      loyaltyPoints: c.loyaltyPoints ?? 0,
      tier: 'Standard',
      totalSpent: c.totalSpent ?? 0,
      totalVisits: 1,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    }
  },

  async deleteCustomer(id: string): Promise<void> {
    await api.delete('/customers/' + id)
  },

  async getLoyaltyHistory(customerId: string): Promise<LoyaltyTransaction[]> {
    try {
      const res = await api.get<any>('/customers/' + customerId + '/loyalty')
      return res.data?.data || res.data || []
    } catch {
      return []
    }
  },
}
