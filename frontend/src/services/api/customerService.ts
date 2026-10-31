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
    try {
      const res = await api.post<any>('/customers', data)
      const c = res.data?.data || res.data
      return {
        id: c._id || c.id,
        name: c.name,
        phone: c.phone,
        email: c.email || '',
        address: c.address || '',
        loyaltyPoints: 0,
        tier: 'Standard',
        totalSpent: 0,
        totalVisits: 0,
        createdAt: new Date().toISOString(),
      }
    } catch {
      const newCust: Customer = {
        ...data,
        id: 'cust-' + Date.now(),
        loyaltyPoints: 0,
        tier: 'Standard',
        totalSpent: 0,
        totalVisits: 0,
        createdAt: new Date().toISOString(),
      }
      localStore.customers.unshift(newCust)
      return newCust
    }
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    try {
      const res = await api.put<any>('/customers/' + id, data)
      const c = res.data?.data || res.data
      return {
        id: c._id || c.id,
        name: c.name,
        phone: c.phone,
        email: c.email || '',
        loyaltyPoints: c.loyaltyPoints ?? 0,
        tier: 'Standard',
        totalSpent: c.totalSpent ?? 0,
        totalVisits: 1,
        createdAt: new Date().toISOString(),
      }
    } catch {
      const idx = localStore.customers.findIndex((c) => c.id === id)
      if (idx === -1) throw new Error('Customer not found')
      const updated = { ...localStore.customers[idx], ...data }
      localStore.customers[idx] = updated
      return updated
    }
  },

  async deleteCustomer(id: string): Promise<void> {
    try {
      await api.delete('/customers/' + id)
    } catch {
      const idx = localStore.customers.findIndex((c) => c.id === id)
      if (idx !== -1) localStore.customers.splice(idx, 1)
    }
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
