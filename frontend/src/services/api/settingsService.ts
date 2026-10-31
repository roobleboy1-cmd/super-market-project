import api from './client'
import type { StoreSettings, PaymentMethod } from '@/types'
import { localStore } from '../dataStore'

export function mapBackendSettings(raw: any): StoreSettings {
  if (!raw) return localStore.settings

  const methodsMap: Record<string, PaymentMethod> = {
    'CASH': 'Cash',
    'CARD': 'Card',
    'EVC_PLUS': 'EVC Plus',
    'EDAHAB': 'eDahab',
    'ZAAD': 'ZAAD',
    'BANK_TRANSFER': 'Bank Transfer',
  }

  const enabledPaymentMethods: PaymentMethod[] = Array.isArray(raw.paymentMethodsConfig)
    ? raw.paymentMethodsConfig
        .filter((m: any) => m.isEnabled)
        .map((m: any) => methodsMap[m.code] || m.label || m.code)
    : (raw.enabledPaymentMethods || ['Cash', 'EVC Plus', 'eDahab', 'ZAAD'])

  return {
    storeName: raw.storeName || raw.supermarketName || 'Central Supermarket Mogadishu',
    tagline: raw.tagline || 'Leading Quality Supermarket in Mogadishu',
    logoUrl: raw.logoUrl || '',
    phone: raw.phone || raw.contact?.phone || '+252 61 5000000',
    email: raw.email || raw.contact?.email || 'contact@supermarket.so',
    address: typeof raw.address === 'string' ? raw.address : (raw.address?.street || 'KM4 Maka Al Mukarama Road'),
    city: raw.city || (typeof raw.address === 'object' ? raw.address?.city : '') || 'Mogadishu',
    taxNumber: raw.taxNumber || 'SO-TAX-2026-9922',
    currency: (raw.currency === 'SOS' ? 'SOS' : 'USD') as 'USD' | 'SOS',
    timezone: raw.timezone || 'Africa/Mogadishu (UTC+3)',
    defaultTaxRate: raw.defaultTaxRate ?? 5,
    taxInclusive: raw.taxInclusive ?? true,
    thermalPrinterType: raw.thermalPrinterType || '80mm',
    receiptHeader: raw.receiptHeader || raw.receiptConfig?.headerText || 'Thank you for shopping with us!',
    receiptFooter: raw.receiptFooter || raw.receiptConfig?.footerText || 'Goods sold are subject to our return policy within 7 days.',
    lowStockThresholdDefault: raw.lowStockThresholdDefault ?? raw.stockThresholds?.defaultLowStockAlert ?? 10,
    expiryAlertDaysDefault: raw.expiryAlertDaysDefault ?? raw.stockThresholds?.expiryAlertDays ?? 30,
    loyaltyPointsPerDollar: raw.loyaltyPointsPerDollar ?? raw.loyaltyConfig?.pointsPerDollar ?? 1,
    loyaltyRedemptionRate: raw.loyaltyRedemptionRate ?? raw.loyaltyConfig?.redemptionRate ?? 0.01,
    enabledPaymentMethods,
  }
}

export const settingsService = {
  async getSettings(): Promise<StoreSettings> {
    try {
      const res = await api.get<any>('/settings')
      return mapBackendSettings(res.data?.data || res.data)
    } catch {
      return localStore.settings
    }
  },

  async updateSettings(data: Partial<StoreSettings>): Promise<StoreSettings> {
    const payload: any = {
      supermarketName: data.storeName,
      tagline: data.tagline,
      taxNumber: data.taxNumber,
      currency: data.currency,
      timezone: data.timezone,
      defaultTaxRate: data.defaultTaxRate,
      contact: {
        phone: data.phone,
        email: data.email,
      },
      address: {
        street: data.address,
        city: data.city,
      },
      receiptConfig: {
        headerText: data.receiptHeader,
        footerText: data.receiptFooter,
      },
      stockThresholds: {
        defaultLowStockAlert: data.lowStockThresholdDefault,
        expiryAlertDays: data.expiryAlertDaysDefault,
      },
      loyaltyConfig: {
        pointsPerDollar: data.loyaltyPointsPerDollar,
        redemptionRate: data.loyaltyRedemptionRate,
      },
    }

    try {
      const res = await api.patch<any>('/settings', payload)
      const mapped = mapBackendSettings(res.data?.data || res.data)
      localStore.settings = mapped
      return mapped
    } catch {
      localStore.settings = { ...localStore.settings, ...data }
      localStore.logAction('Admin', 'Super Admin', 'UPDATE_SETTINGS', 'Store Settings', 'Updated supermarket operational settings')
      return localStore.settings
    }
  },
}
