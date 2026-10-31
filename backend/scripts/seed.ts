import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { connectDB, disconnectDB } from '../src/config/database';
import { User } from '../src/models/User';
import { StoreSettings } from '../src/models/StoreSettings';
import { Unit } from '../src/models/Unit';
import { Category } from '../src/models/Category';
import { Brand } from '../src/models/Brand';
import { Supplier } from '../src/models/Supplier';
import { Product } from '../src/models/Product';
import { InventoryLot } from '../src/models/InventoryLot';
import { StockMovement } from '../src/models/StockMovement';
import { Customer } from '../src/models/Customer';
import { Coupon } from '../src/models/Coupon';
import { UserRole } from '../src/types/roles';
import { hashPassword } from '../src/utils/crypto';
import { logger } from '../src/config/logger';

async function seed() {
  try {
    logger.info('Starting supermarket database seeding...');
    await connectDB();

    // 1. Initial Administrator & Staff Accounts
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@supermarket.local';
    const adminPass = process.env.ADMIN_PASSWORD || 'AdminPass123!';

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      const passwordHash = await hashPassword(adminPass);
      admin = await User.create({
        name: 'Head Administrator',
        email: adminEmail,
        passwordHash,
        role: UserRole.ADMIN,
        phone: '+252 61 5111111',
        status: 'active'
      });
      logger.info(`✅ Initial Administrator account created: ${adminEmail}`);
    } else {
      logger.info(`ℹ️ Administrator account already exists: ${adminEmail}`);
    }

    // Seed Manager
    const managerEmail = 'manager@supermarket.local';
    if (!(await User.findOne({ email: managerEmail }))) {
      await User.create({
        name: 'Store General Manager',
        email: managerEmail,
        passwordHash: await hashPassword('Manager123!'),
        role: UserRole.MANAGER,
        phone: '+252 61 5222222',
        status: 'active'
      });
      logger.info(`✅ Manager account created: ${managerEmail}`);
    }

    // Seed Cashier
    const cashierEmail = 'cashier1@supermarket.local';
    if (!(await User.findOne({ email: cashierEmail }))) {
      await User.create({
        name: 'Fatima Cashier',
        email: cashierEmail,
        passwordHash: await hashPassword('Cashier123!'),
        role: UserRole.CASHIER,
        phone: '+252 61 5333333',
        status: 'active'
      });
      logger.info(`✅ Cashier account created: ${cashierEmail}`);
    }

    // 2. Single StoreSettings
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = await StoreSettings.create({
        supermarketName: 'Central Supermarket',
        address: {
          street: 'KM4 Maka Al Mukarama Road',
          city: 'Mogadishu',
          country: 'Somalia'
        },
        contact: {
          phone: '+252 61 5000000',
          email: 'contact@supermarket.local'
        },
        taxNumber: 'TAX-SO-992211',
        timezone: 'Africa/Mogadishu',
        currency: 'USD',
        currencySymbol: '$',
        defaultTaxRate: 5,
        paymentMethodsConfig: [
          { code: 'CASH', label: 'Cash USD', isEnabled: true, requiresReference: false },
          { code: 'CARD', label: 'Debit/Credit Card', isEnabled: true, requiresReference: true },
          { code: 'EVC_PLUS', label: 'EVC Plus', isEnabled: true, requiresReference: true },
          { code: 'EDAHAB', label: 'eDahab', isEnabled: true, requiresReference: true },
          { code: 'ZAAD', label: 'ZAAD Service', isEnabled: true, requiresReference: true }
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
      logger.info('✅ Single StoreSettings initialized');
    }

    // 3. Units
    const unitsData = [
      { name: 'Pieces', symbol: 'pcs', precision: 0 },
      { name: 'Kilograms', symbol: 'kg', precision: 3 },
      { name: 'Liters', symbol: 'L', precision: 2 },
      { name: 'Pack', symbol: 'pk', precision: 0 }
    ];

    const unitMap = new Map();
    for (const u of unitsData) {
      let unitDoc = await Unit.findOne({ symbol: u.symbol });
      if (!unitDoc) {
        unitDoc = await Unit.create(u);
      }
      unitMap.set(u.symbol, unitDoc._id);
    }
    logger.info('✅ Units verified');

    // 4. Categories
    const categoriesData = [
      { name: 'Dairy & Eggs', code: 'DAIRY' },
      { name: 'Bakery', code: 'BAKERY' },
      { name: 'Beverages', code: 'BEVERAGE' },
      { name: 'Snacks & Confectionery', code: 'SNACKS' },
      { name: 'Fresh Produce', code: 'PRODUCE' }
    ];

    const catMap = new Map();
    for (const c of categoriesData) {
      let catDoc = await Category.findOne({ code: c.code });
      if (!catDoc) {
        catDoc = await Category.create(c);
      }
      catMap.set(c.code, catDoc._id);
    }
    logger.info('✅ Categories verified');

    // 5. Brands
    const brandsData = [{ name: 'FreshValley' }, { name: 'PureLife' }, { name: 'GoldenGrain' }];
    const brandMap = new Map();
    for (const b of brandsData) {
      let brandDoc = await Brand.findOne({ name: b.name });
      if (!brandDoc) {
        brandDoc = await Brand.create(b);
      }
      brandMap.set(b.name, brandDoc._id);
    }

    // 6. Suppliers
    let supplier = await Supplier.findOne({ companyName: 'Mogadishu FMCG Wholesalers' });
    if (!supplier) {
      supplier = await Supplier.create({
        name: 'Ahmed Wholesale Manager',
        companyName: 'Mogadishu FMCG Wholesalers',
        email: 'sales@fmcgwholesalers.local',
        phone: '+252 61 7000000',
        paymentTerms: 'Net 30'
      });
      logger.info('✅ Supplier created');
    }

    // 7. Products
    const sampleProducts = [
      {
        name: 'Whole Milk 1L Bottle',
        sku: 'MILK-1L',
        barcode: '6001002003001',
        category: catMap.get('DAIRY'),
        brand: brandMap.get('FreshValley'),
        unit: unitMap.get('L'),
        defaultSupplier: supplier._id,
        costPrice: 0.85,
        sellingPrice: 1.25,
        taxRate: 5,
        currentStock: 50,
        minStockLevel: 10,
        isExpiringProduct: true
      },
      {
        name: 'Fresh French Baguette',
        sku: 'BREAD-BAGUETTE',
        barcode: '6001002003002',
        category: catMap.get('BAKERY'),
        brand: brandMap.get('GoldenGrain'),
        unit: unitMap.get('pcs'),
        defaultSupplier: supplier._id,
        costPrice: 0.5,
        sellingPrice: 0.99,
        taxRate: 0,
        currentStock: 30,
        minStockLevel: 5,
        isExpiringProduct: true
      },
      {
        name: 'Sparkling Mineral Water 500ml',
        sku: 'WATER-SPK-500',
        barcode: '6001002003003',
        category: catMap.get('BEVERAGE'),
        brand: brandMap.get('PureLife'),
        unit: unitMap.get('pcs'),
        defaultSupplier: supplier._id,
        costPrice: 0.3,
        sellingPrice: 0.6,
        taxRate: 5,
        currentStock: 100,
        minStockLevel: 20,
        isExpiringProduct: false
      },
      {
        name: 'Crispy Potato Chips 150g',
        sku: 'CHIPS-150G',
        barcode: '6001002003004',
        category: catMap.get('SNACKS'),
        unit: unitMap.get('pk'),
        defaultSupplier: supplier._id,
        costPrice: 0.7,
        sellingPrice: 1.5,
        taxRate: 5,
        currentStock: 40,
        minStockLevel: 8,
        isExpiringProduct: true
      }
    ];

    for (const prodData of sampleProducts) {
      let product = await Product.findOne({ sku: prodData.sku });
      if (!product) {
        product = await Product.create(prodData);

        // Create initial InventoryLot
        const lot = await InventoryLot.create({
          productId: product._id,
          batchNumber: `INIT-${prodData.sku}`,
          quantityReceived: prodData.currentStock,
          remainingQuantity: prodData.currentStock,
          unitCost: prodData.costPrice,
          expirationDate: prodData.isExpiringProduct
            ? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days in future
            : undefined,
          receivedDate: new Date(),
          supplierId: supplier._id,
          status: 'active'
        });

        // Create initial StockMovement
        await StockMovement.create({
          productId: product._id,
          lotId: lot._id,
          movementType: 'ADJUSTMENT',
          quantity: prodData.currentStock,
          previousStock: 0,
          newStock: prodData.currentStock,
          unitCost: prodData.costPrice,
          reason: 'Initial store inventory opening balance',
          performedBy: admin._id
        });
      }
    }
    logger.info('✅ Sample products and initial batches seeded');

    // 8. Sample Customer
    let customer = await Customer.findOne({ phone: '+252 61 8888888' });
    if (!customer) {
      customer = await Customer.create({
        name: 'Hassan Customer',
        phone: '+252 61 8888888',
        email: 'hassan@customer.local',
        loyaltyPoints: 150,
        totalSpent: 150
      });
      logger.info('✅ Sample customer seeded');
    }

    // 9. Promotional Coupon
    let coupon = await Coupon.findOne({ code: 'WELCOME10' });
    if (!coupon) {
      await Coupon.create({
        code: 'WELCOME10',
        description: '10% discount on orders over $10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValue: 10,
        maxDiscount: 5,
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        usageLimit: 100,
        timesUsed: 0,
        isActive: true
      });
      logger.info('✅ Promotional coupon WELCOME10 seeded');
    }

    logger.info('🎉 Seeding successfully completed!');
    logger.info('--------------------------------------------------');
    logger.info(`Admin Login:    ${adminEmail}`);
    logger.info(`Admin Password: ${adminPass}`);
    logger.info('--------------------------------------------------');
  } catch (error: any) {
    logger.error(`❌ Seeding error: ${error.message}`, { stack: error.stack });
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

seed();
