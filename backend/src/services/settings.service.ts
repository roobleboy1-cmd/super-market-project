import { StoreSettings, IStoreSettings } from '../models/StoreSettings';
import { AuditService } from './audit.service';

export class SettingsService {
  /**
   * Fetch single supermarket settings record (creates default if none exists)
   */
  static async getSettings(): Promise<IStoreSettings> {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = await StoreSettings.create({
        supermarketName: 'Central City Supermarket',
        address: {
          street: '100 Main Commercial Avenue',
          city: 'Mogadishu',
          country: 'Somalia'
        },
        contact: {
          phone: '+252 61 5000000',
          email: 'info@supermarket.local'
        },
        taxNumber: 'TAX-SO-889922',
        timezone: 'Africa/Mogadishu',
        currency: 'USD',
        currencySymbol: '$',
        defaultTaxRate: 5,
        paymentMethodsConfig: [
          { code: 'CASH', label: 'Cash', isEnabled: true, requiresReference: false },
          { code: 'CARD', label: 'Credit/Debit Card', isEnabled: true, requiresReference: true },
          { code: 'EVC_PLUS', label: 'EVC Plus (Hormuud)', isEnabled: true, requiresReference: true },
          { code: 'EDAHAB', label: 'eDahab (Somtel)', isEnabled: true, requiresReference: true },
          { code: 'ZAAD', label: 'ZAAD (Telesom)', isEnabled: true, requiresReference: true },
          { code: 'BANK_TRANSFER', label: 'Bank Transfer', isEnabled: true, requiresReference: true }
        ],
        stockThresholds: {
          defaultLowStockAlert: 10,
          expiryAlertDays: 30
        },
        loyaltyConfig: {
          isEnabled: true,
          pointsPerDollar: 1,
          redemptionRate: 0.01
        }
      });
    }
    return settings;
  }

  /**
   * Update supermarket settings
   */
  static async updateSettings(data: Partial<IStoreSettings>, userId: string) {
    const settings = await this.getSettings();

    // Deep merge settings
    if (data.supermarketName) settings.supermarketName = data.supermarketName;
    if (data.logoUrl !== undefined) settings.logoUrl = data.logoUrl;
    if (data.taxNumber !== undefined) settings.taxNumber = data.taxNumber;
    if (data.timezone) settings.timezone = data.timezone;
    if (data.currency) settings.currency = data.currency;
    if (data.currencySymbol) settings.currencySymbol = data.currencySymbol;
    if (data.defaultTaxRate !== undefined) settings.defaultTaxRate = data.defaultTaxRate;

    if (data.address) {
      settings.address = { ...settings.address, ...data.address };
    }
    if (data.contact) {
      settings.contact = { ...settings.contact, ...data.contact };
    }
    if (data.receiptConfig) {
      settings.receiptConfig = { ...settings.receiptConfig, ...data.receiptConfig };
    }
    if (data.paymentMethodsConfig) {
      settings.paymentMethodsConfig = data.paymentMethodsConfig;
    }
    if (data.stockThresholds) {
      settings.stockThresholds = { ...settings.stockThresholds, ...data.stockThresholds };
    }
    if (data.loyaltyConfig) {
      settings.loyaltyConfig = { ...settings.loyaltyConfig, ...data.loyaltyConfig };
    }

    await settings.save();

    await AuditService.log({
      actorId: userId,
      action: 'STORE_SETTINGS_UPDATED',
      entity: 'StoreSettings',
      entityId: (settings._id as any).toString(),
      changes: data
    });

    return settings;
  }
}
