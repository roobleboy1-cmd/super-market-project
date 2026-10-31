import api from './client'
import type { Expense, ExpenseCategory, PaymentMethod } from '@/types'
import { localStore } from '../dataStore'

export const expenseService = {
  async getExpenses(category?: string): Promise<Expense[]> {
    try {
      const res = await api.get<any>('/expenses', { params: { category: category !== 'all' ? category : undefined } })
      const raw = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : [])
      return raw.map((e: any) => ({
        id: e._id || e.id,
        expenseNumber: e.expenseNumber,
        title: e.description || e.title || 'Store Expense',
        category: e.category,
        amount: e.amount,
        paymentMethod: e.paymentMethod,
        expenseDate: e.paidDate ? new Date(e.paidDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        paidTo: e.paidTo,
        receiptReference: e.receiptUrl || e.receiptReference,
        notes: e.notes,
        recordedBy: e.recordedBy?.name || e.recordedBy || 'Finance',
        createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : new Date().toISOString(),
      }))
    } catch {
      if (!category || category === 'all') return localStore.expenses
      return localStore.expenses.filter((e) => e.category === category)
    }
  },

  async createExpense(data: {
    title: string
    category: ExpenseCategory
    amount: number
    paymentMethod: PaymentMethod
    expenseDate: string
    paidTo: string
    receiptReference?: string
    notes?: string
    recordedBy: string
  }): Promise<Expense> {
    try {
      const res = await api.post<any>('/expenses', {
        expenseNumber: 'EXP-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900),
        category: data.category,
        description: data.title,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paidTo: data.paidTo,
        paidDate: data.expenseDate,
        notes: data.notes,
      })
      const e = res.data?.data || res.data
      return {
        id: e._id || e.id,
        expenseNumber: e.expenseNumber,
        title: e.description || data.title,
        category: e.category,
        amount: e.amount,
        paymentMethod: e.paymentMethod,
        expenseDate: data.expenseDate,
        paidTo: data.paidTo,
        recordedBy: data.recordedBy,
        createdAt: new Date().toISOString(),
      }
    } catch {
      const newExp: Expense = {
        ...data,
        id: 'exp-' + Date.now(),
        expenseNumber: 'EXP-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900),
        createdAt: new Date().toISOString(),
      }
      localStore.expenses.unshift(newExp)
      return newExp
    }
  },

  async deleteExpense(id: string): Promise<void> {
    try {
      await api.delete('/expenses/' + id)
    } catch {
      const idx = localStore.expenses.findIndex((e) => e.id === id)
      if (idx !== -1) localStore.expenses.splice(idx, 1)
    }
  },
}
