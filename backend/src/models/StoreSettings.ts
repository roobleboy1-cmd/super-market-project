import mongoose, { Document, Schema } from 'mongoose';

export interface IStoreSettings extends Document {
  supermarketName: string;
  logoUrl?: string;
  address: {
    street: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  taxNumber?: string;
  timezone: string;
  currency: string;
  currencySymbol: string;
  defaultTaxRate: number;
  receiptConfig: {
    headerText: string;
    footerText: string;
    showTaxNumber: boolean;
    showCashierName: boolean;
    showBarcode: boolean;
  };
  paymentMethodsConfig: Array<{
    code: string;
    label: string;
    isEnabled: boolean;
    requiresReference: boolean;
  }>;
  stockThresholds: {
    defaultLowStockAlert: number;
    expiryAlertDays: number;
  };
  loyaltyConfig: {
    isEnabled: boolean;
    pointsPerDollar: number;
    redemptionRate: number; // e.g. 100 points = $1.00
  };
  createdAt: Date;
  updatedAt: Date;
}

const storeSettingsSchema = new Schema<IStoreSettings>(
  {
    supermarketName: { type: String, required: true, default: 'Central City Supermarket' },
    logoUrl: { type: String, default: '' },
    address: {
      street: { type: String, default: '100 Main Commercial Avenue' },
      city: { type: String, default: 'Mogadishu' },
      state: { type: String, default: 'Banaadir' },
      country: { type: String, default: 'Somalia' },
      postalCode: { type: String, default: '00100' }
    },
    contact: {
      phone: { type: String, default: '+252 61 5000000' },
      email: { type: String, default: 'info@supermarket.local' },
      website: { type: String, default: 'https://supermarket.local' }
    },
    taxNumber: { type: String, default: 'TAX-SO-889922' },
    timezone: { type: String, default: 'Africa/Mogadishu' },
    currency: { type: String, default: 'USD' },
    currencySymbol: { type: String, default: '$' },
    defaultTaxRate: { type: Number, default: 5 },
    receiptConfig: {
      headerText: { type: String, default: 'Thank you for shopping with us!' },
      footerText: { type: String, default: 'Goods sold are subject to our return policy within 7 days.' },
      showTaxNumber: { type: Boolean, default: true },
      showCashierName: { type: Boolean, default: true },
      showBarcode: { type: Boolean, default: true }
    },
    paymentMethodsConfig: [
      {
        code: { type: String, required: true },
        label: { type: String, required: true },
        isEnabled: { type: Boolean, default: true },
        requiresReference: { type: Boolean, default: false }
      }
    ],
    stockThresholds: {
      defaultLowStockAlert: { type: Number, default: 10 },
      expiryAlertDays: { type: Number, default: 30 }
    },
    loyaltyConfig: {
      isEnabled: { type: Boolean, default: true },
      pointsPerDollar: { type: Number, default: 1 },
      redemptionRate: { type: Number, default: 0.01 } // 100 points = $1
    }
  },
  {
    timestamps: true
  }
);

export const StoreSettings = mongoose.model<IStoreSettings>('StoreSettings', storeSettingsSchema);
