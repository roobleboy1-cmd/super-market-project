import api from './client'
import type { Expense, ExpenseCategory, PaymentMethod } from '@/types'
import { localStore } from '../dataStore'

const METHOD_MAP: Record<string, string> = {
  'Cash': 'CASH',
  'Card': 'CARD',
  'EVC Plus': 'EVC_PLUS',
  'eDahab': 'EDAHAB',
  'ZAAD': 'ZAAD',
  'Bank Transfer': 'BANK_TRANSFER',
}

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
    const res = await api.post<any>('/expenses', {
      category: data.category,
      description: data.title,
      amount: data.amount,
      paymentMethod: METHOD_MAP[data.paymentMethod] || 'CASH',
      paidTo: data.paidTo,
      paidDate: new Date(data.expenseDate || Date.now()).toISOString(),
      notes: data.notes,
    })
    const e = res.data?.data || res.data
    return {
      id: e._id || e.id,
      expenseNumber: e.expenseNumber,
      title: e.description || data.title,
      category: e.category,
      amount: e.amount,
      paymentMethod: data.paymentMethod,
      expenseDate: data.expenseDate,
      paidTo: data.paidTo,
      recordedBy: data.recordedBy,
      createdAt: new Date().toISOString(),
    }
  },

  async deleteExpense(id: string): Promise<void> {
    await api.delete('/expenses/' + id)
  },
}
