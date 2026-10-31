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
import { Sale } from '../src/models/Sale';
import { Expense } from '../src/models/Expense';
import { CashierShift } from '../src/models/CashierShift';
import { UserRole } from '../src/types/roles';
import { hashPassword } from '../src/utils/crypto';
import { logger } from '../src/config/logger';

async function seedRichData() {
  try {
    logger.info('🚀 Starting Supermarket Rich Data Seeder...');
    await connectDB();

    // 0. Clean old transaction and catalog data (keep schema clean)
    logger.info('🧹 Cleaning up old collections...');
    await Promise.all([
      Product.deleteMany({}),
      InventoryLot.deleteMany({}),
      StockMovement.deleteMany({}),
      Category.deleteMany({}),
      Brand.deleteMany({}),
      Supplier.deleteMany({}),
      Unit.deleteMany({}),
      Customer.deleteMany({}),
      Coupon.deleteMany({}),
      Sale.deleteMany({}),
      Expense.deleteMany({}),
      CashierShift.deleteMany({})
    ]);

    // 1. Staff Accounts & Users
    const sharedPasswordHash = await hashPassword('Supermarket@2026');
    const adminEmail = 'admin@supermarket.so';

    const usersToCreate = [
      {
        name: 'Ahmed Noor (Super Admin)',
        email: adminEmail,
        passwordHash: sharedPasswordHash,
        role: UserRole.ADMIN,
        phone: '+252 61 5111111',
        status: 'active'
      },
      {
        name: 'Fadumo Warsame (Store Manager)',
        email: 'fadumo.mgr@supermarket.so',
        passwordHash: sharedPasswordHash,
        role: UserRole.MANAGER,
        phone: '+252 61 5222222',
        status: 'active'
      },
      {
        name: 'Hassan Ali (Lead Cashier)',
        email: 'hassan.cashier@supermarket.so',
        passwordHash: sharedPasswordHash,
        role: UserRole.CASHIER,
        phone: '+252 61 5333333',
        status: 'active'
      },
      {
        name: 'Khadija Osman (Inventory Manager)',
        email: 'khadija.inv@supermarket.so',
        passwordHash: sharedPasswordHash,
        role: UserRole.INVENTORY_MANAGER,
        phone: '+252 61 5444444',
        status: 'active'
      },
      {
        name: 'Mohamed Jama (Chief Accountant)',
        email: 'jama.acc@supermarket.so',
        passwordHash: sharedPasswordHash,
        role: UserRole.ACCOUNTANT,
        phone: '+252 61 5555555',
        status: 'active'
      },
      {
        name: 'Sahra Abdi (Internal Auditor)',
        email: 'sahra.audit@supermarket.so',
        passwordHash: sharedPasswordHash,
        role: UserRole.AUDITOR,
        phone: '+252 61 5666666',
        status: 'active'
      },
      {
        name: 'Head Administrator',
        email: 'admin@supermarket.local',
        passwordHash: await hashPassword('AdminPass123!'),
        role: UserRole.ADMIN,
        phone: '+252 61 5000001',
        status: 'active'
      }
    ];

    await User.deleteMany({ email: { $in: usersToCreate.map(u => u.email) } });
    const createdUsers = await User.insertMany(usersToCreate);
    const adminUser = createdUsers.find(u => u.email === adminEmail) || createdUsers[0];
    const cashierUser = createdUsers.find(u => u.email === 'hassan.cashier@supermarket.so') || createdUsers[2];
    const managerUser = createdUsers.find(u => u.email === 'fadumo.mgr@supermarket.so') || createdUsers[1];
    logger.info(`✅ ${createdUsers.length} Users initialized.`);

    // 2. Single StoreSettings
    await StoreSettings.deleteMany({});
    await StoreSettings.create({
      supermarketName: 'Central Supermarket Mogadishu',
      address: {
        street: 'KM4 Maka Al Mukarama Road, Hodan',
        city: 'Mogadishu',
        country: 'Somalia'
      },
      contact: {
        phone: '+252 61 5000000',
        email: 'contact@supermarket.so'
      },
      taxNumber: 'SO-TAX-2026-9922',
      timezone: 'Africa/Mogadishu',
      currency: 'USD',
      currencySymbol: '$',
      defaultTaxRate: 5,
      paymentMethodsConfig: [
        { code: 'CASH', label: 'Cash USD', isEnabled: true, requiresReference: false },
        { code: 'EVC_PLUS', label: 'Hormuud EVC Plus', isEnabled: true, requiresReference: true },
        { code: 'EDAHAB', label: 'Somtel eDahab', isEnabled: true, requiresReference: true },
        { code: 'ZAAD', label: 'Telesom ZAAD', isEnabled: true, requiresReference: true },
        { code: 'CARD', label: 'Visa / MasterCard', isEnabled: true, requiresReference: true }
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
    logger.info('✅ Store Settings configured.');

    // 3. Units
    const unitsData = [
      { name: 'Pieces', symbol: 'pcs', precision: 0 },
      { name: 'Kilograms', symbol: 'kg', precision: 2 },
      { name: 'Liters', symbol: 'L', precision: 2 },
      { name: 'Pack', symbol: 'pk', precision: 0 },
      { name: 'Box', symbol: 'box', precision: 0 },
      { name: 'Bottle', symbol: 'btl', precision: 0 },
      { name: 'Can', symbol: 'can', precision: 0 }
    ];
    const unitsDocs = await Unit.insertMany(unitsData);
    const unitMap = new Map<string, mongoose.Types.ObjectId>();
    unitsDocs.forEach(u => unitMap.set(u.symbol, u._id as mongoose.Types.ObjectId));
    logger.info(`✅ ${unitsDocs.length} Units created.`);

    // 4. Categories
    const categoriesData = [
      { name: 'Grains & Staples', code: 'GRAINS', description: 'Rice, Flour, Sugar, Pasta and Cereals' },
      { name: 'Dairy & Eggs', code: 'DAIRY', description: 'Fresh Milk, Cheese, Eggs, Butter and Yoghurt' },
      { name: 'Beverages', code: 'BEVERAGE', description: 'Juices, Sodas, Water, Tea and Coffee' },
      { name: 'Cooking & Oils', code: 'OILS', description: 'Vegetable, Sunflower, Olive and Corn Cooking Oils' },
      { name: 'Canned Foods', code: 'CANNED', description: 'Canned Tuna, Beans, Sweet Corn and Tomato Paste' },
      { name: 'Fresh Produce', code: 'PRODUCE', description: 'Fresh Local Fruits, Vegetables, Onions and Potatoes' },
      { name: 'Bakery & Breakfast', code: 'BAKERY', description: 'Fresh Bread, Sambusa, Pastries and Cereals' },
      { name: 'Snacks & Sweets', code: 'SNACKS', description: 'Biscuits, Potato Chips, Chocolates and Candies' },
      { name: 'Cleaning & Household', code: 'CLEANING', description: 'Detergents, Soaps, Disinfectants and Paper Towels' },
      { name: 'Personal Care & Hygiene', code: 'HYGIENE', description: 'Shampoos, Soaps, Toothpaste and Body Lotions' }
    ];
    const catDocs = await Category.insertMany(categoriesData);
    const catMap = new Map<string, mongoose.Types.ObjectId>();
    catDocs.forEach(c => catMap.set(c.code, c._id as mongoose.Types.ObjectId));
    logger.info(`✅ ${catDocs.length} Categories created.`);

    // 5. Brands
    const brandsData = [
      { name: 'SomFresh Dairy', description: 'Fresh Somali farm dairy products' },
      { name: 'Bakhresa Group', description: 'Azam wheat flour, grains and pasta' },
      { name: 'Daawat Rice', description: 'Premium aromatic basmati rice' },
      { name: 'Almarai', description: 'Middle Eastern high quality dairy and cheese' },
      { name: 'Barilla', description: 'Authentic Italian pasta & noodles' },
      { name: 'Coca-Cola', description: 'Global soft drinks and sodas' },
      { name: 'Vimto', description: 'Famous cordial fruit syrup' },
      { name: 'Afia', description: 'Pure corn and sunflower cooking oil' },
      { name: 'Lipton', description: 'Black and green tea leaves and bags' },
      { name: 'Omo', description: 'Power washing detergent' },
      { name: 'Sunlight', description: 'Sparkling dishwash & cleaners' },
      { name: 'Colgate', description: 'Dental and oral care products' }
    ];
    const brandDocs = await Brand.insertMany(brandsData);
    const brandMap = new Map<string, mongoose.Types.ObjectId>();
    brandDocs.forEach(b => brandMap.set(b.name, b._id as mongoose.Types.ObjectId));
    logger.info(`✅ ${brandDocs.length} Brands created.`);

    // 6. Suppliers
    const suppliersData = [
      {
        name: 'Mohamed Abdullahi',
        companyName: 'Mogadishu FMCG Wholesalers',
        email: 'sales@fmcgwholesalers.so',
        phone: '+252 61 7000000',
        address: 'Bakaaro Market, Wholesale Zone 3',
        paymentTerms: 'Net 30'
      },
      {
        name: 'Hassan Guled',
        companyName: 'Hormuud Food & Distribution',
        email: 'distribution@hormuudfood.so',
        phone: '+252 61 7111222',
        address: 'Maka Al Mukarama Road, KM5',
        paymentTerms: 'Net 15'
      },
      {
        name: 'Maryan Jimale',
        companyName: 'SomFresh Farms & Dairy',
        email: 'orders@somfreshfarms.so',
        phone: '+252 61 7222333',
        address: 'Afgooye Agricultural Road',
        paymentTerms: 'Cash on Delivery'
      },
      {
        name: 'Omar Sheikh',
        companyName: 'Al-Barka Global Import & Logistics',
        email: 'imports@albarka.so',
        phone: '+252 61 7333444',
        address: 'Mogadishu Seaport Industrial Park',
        paymentTerms: 'Net 45'
      },
      {
        name: 'Khadra Warsame',
        companyName: 'Barwaaqo Household & Chemical Supplies',
        email: 'contact@barwaaqo-supplies.so',
        phone: '+252 61 7444555',
        address: 'Hodan Commercial Center',
        paymentTerms: 'Net 30'
      }
    ];
    const supplierDocs = await Supplier.insertMany(suppliersData);
    const sFmcg = supplierDocs[0]._id;
    const sHormuud = supplierDocs[1]._id;
    const sSomFresh = supplierDocs[2]._id;
    const sAlBarka = supplierDocs[3]._id;
    const sBarwaaqo = supplierDocs[4]._id;
    logger.info(`✅ ${supplierDocs.length} Suppliers created.`);

    // 7. Products & Inventory Lots
    interface ProductDefinition {
      name: string;
      sku: string;
      barcode: string;
      categoryCode: string;
      brandName: string;
      unitSymbol: string;
      supplierId: any;
      costPrice: number;
      sellingPrice: number;
      taxRate: number;
      currentStock: number;
      minStockLevel: number;
      maxStockLevel: number;
      isExpiringProduct: boolean;
      trackBatch: boolean;
      daysToExpiry?: number;
      imageUrl: string;
      description: string;
    }

    const productsDef: ProductDefinition[] = [
      // GRAINS
      {
        name: 'Daawat Basmati Rice 5kg',
        sku: 'RICE-5KG',
        barcode: '60010001',
        categoryCode: 'GRAINS',
        brandName: 'Daawat Rice',
        unitSymbol: 'kg',
        supplierId: sFmcg,
        costPrice: 6.5,
        sellingPrice: 8.5,
        taxRate: 5,
        currentStock: 80,
        minStockLevel: 15,
        maxStockLevel: 200,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 360,
        imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
        description: 'Premium aromatic traditional long grain basmati rice.'
      },
      {
        name: 'Daawat Super Basmati Rice 25kg',
        sku: 'RICE-25KG',
        barcode: '60010002',
        categoryCode: 'GRAINS',
        brandName: 'Daawat Rice',
        unitSymbol: 'kg',
        supplierId: sFmcg,
        costPrice: 28.0,
        sellingPrice: 34.0,
        taxRate: 5,
        currentStock: 40,
        minStockLevel: 10,
        maxStockLevel: 100,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 360,
        imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
        description: 'Bulk sack 25kg authentic pure basmati grain.'
      },
      {
        name: 'Bakhresa White Cane Sugar 10kg',
        sku: 'SUGAR-10KG',
        barcode: '60010003',
        categoryCode: 'GRAINS',
        brandName: 'Bakhresa Group',
        unitSymbol: 'kg',
        supplierId: sHormuud,
        costPrice: 9.0,
        sellingPrice: 11.5,
        taxRate: 5,
        currentStock: 65,
        minStockLevel: 12,
        maxStockLevel: 150,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 720,
        imageUrl: 'https://images.unsplash.com/photo-1622484212850-cab3c61b5853?w=400',
        description: 'Fine refined white cane table sugar.'
      },
      {
        name: 'Bakhresa Azam Wheat Flour 2kg',
        sku: 'FLOUR-2KG',
        barcode: '60010004',
        categoryCode: 'GRAINS',
        brandName: 'Bakhresa Group',
        unitSymbol: 'kg',
        supplierId: sHormuud,
        costPrice: 1.8,
        sellingPrice: 2.5,
        taxRate: 5,
        currentStock: 90,
        minStockLevel: 20,
        maxStockLevel: 300,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 180,
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
        description: 'All-purpose enriched baking wheat flour.'
      },
      {
        name: 'Barilla Spaghetti No. 5 (500g)',
        sku: 'PASTA-500G',
        barcode: '60010005',
        categoryCode: 'GRAINS',
        brandName: 'Barilla',
        unitSymbol: 'pk',
        supplierId: sAlBarka,
        costPrice: 0.95,
        sellingPrice: 1.45,
        taxRate: 5,
        currentStock: 120,
        minStockLevel: 25,
        maxStockLevel: 300,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 400,
        imageUrl: 'https://images.unsplash.com/photo-1551462147-37885acc36f1?w=400',
        description: 'Traditional 100% durum wheat semolina spaghetti.'
      },
      {
        name: 'Barilla Macaroni Elbows 400g',
        sku: 'MACARONI-400G',
        barcode: '60010006',
        categoryCode: 'GRAINS',
        brandName: 'Barilla',
        unitSymbol: 'pk',
        supplierId: sAlBarka,
        costPrice: 0.8,
        sellingPrice: 1.25,
        taxRate: 5,
        currentStock: 110,
        minStockLevel: 20,
        maxStockLevel: 250,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 400,
        imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=400',
        description: 'Quick-cooking elbow macaroni pasta.'
      },

      // DAIRY & EGGS
      {
        name: 'SomFresh Pasteurized Cow Milk 1L',
        sku: 'MILK-1L',
        barcode: '60010007',
        categoryCode: 'DAIRY',
        brandName: 'SomFresh Dairy',
        unitSymbol: 'L',
        supplierId: sSomFresh,
        costPrice: 0.85,
        sellingPrice: 1.3,
        taxRate: 0,
        currentStock: 45,
        minStockLevel: 10,
        maxStockLevel: 100,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 12, // Near expiry test alert! (<30d)
        imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
        description: 'Fresh local pasteurized whole cow milk.'
      },
      {
        name: 'SomFresh Pure Camel Milk 2L',
        sku: 'CAMEL-MILK-2L',
        barcode: '60010008',
        categoryCode: 'DAIRY',
        brandName: 'SomFresh Dairy',
        unitSymbol: 'L',
        supplierId: sSomFresh,
        costPrice: 2.1,
        sellingPrice: 3.0,
        taxRate: 0,
        currentStock: 25,
        minStockLevel: 8,
        maxStockLevel: 80,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 9, // Near expiry test alert! (<30d)
        imageUrl: 'https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?w=400',
        description: 'Pure organic Somali camel milk, rich in nutrients.'
      },
      {
        name: 'SomFresh Farm Fresh Eggs (Tray of 30)',
        sku: 'EGGS-30PCS',
        barcode: '60010009',
        categoryCode: 'DAIRY',
        brandName: 'SomFresh Dairy',
        unitSymbol: 'box',
        supplierId: sSomFresh,
        costPrice: 3.2,
        sellingPrice: 4.5,
        taxRate: 0,
        currentStock: 50,
        minStockLevel: 10,
        maxStockLevel: 120,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 22, // Near expiry test alert! (<30d)
        imageUrl: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400',
        description: 'Farm-fresh grade A brown chicken eggs.'
      },
      {
        name: 'Almarai Cheddar Cheese Block 200g',
        sku: 'CHEESE-200G',
        barcode: '60010010',
        categoryCode: 'DAIRY',
        brandName: 'Almarai',
        unitSymbol: 'pcs',
        supplierId: sAlBarka,
        costPrice: 1.75,
        sellingPrice: 2.5,
        taxRate: 5,
        currentStock: 60,
        minStockLevel: 10,
        maxStockLevel: 150,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 120,
        imageUrl: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400',
        description: 'Smooth and rich full cream cheddar cheese block.'
      },
      {
        name: 'Almarai Plain Natural Yoghurt 500g',
        sku: 'YOGHURT-500G',
        barcode: '60010011',
        categoryCode: 'DAIRY',
        brandName: 'Almarai',
        unitSymbol: 'pcs',
        supplierId: sAlBarka,
        costPrice: 1.1,
        sellingPrice: 1.75,
        taxRate: 5,
        currentStock: 35,
        minStockLevel: 10,
        maxStockLevel: 100,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 16, // Near expiry test alert! (<30d)
        imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
        description: '100% fresh cows milk probiotic yoghurt.'
      },
      {
        name: 'Almarai Salted Pure Butter 200g',
        sku: 'BUTTER-200G',
        barcode: '60010012',
        categoryCode: 'DAIRY',
        brandName: 'Almarai',
        unitSymbol: 'pcs',
        supplierId: sAlBarka,
        costPrice: 1.4,
        sellingPrice: 2.1,
        taxRate: 5,
        currentStock: 40,
        minStockLevel: 10,
        maxStockLevel: 100,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 90,
        imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400',
        description: 'Creamy pure churned cream salted butter.'
      },

      // BEVERAGES
      {
        name: 'Saafi Pure Bottled Mineral Water 1.5L',
        sku: 'WATER-1500ML',
        barcode: '60010013',
        categoryCode: 'BEVERAGE',
        brandName: 'SomFresh Dairy',
        unitSymbol: 'btl',
        supplierId: sHormuud,
        costPrice: 0.35,
        sellingPrice: 0.6,
        taxRate: 5,
        currentStock: 200,
        minStockLevel: 40,
        maxStockLevel: 500,
        isExpiringProduct: false,
        trackBatch: false,
        imageUrl: 'https://images.unsplash.com/photo-1559839914-17aae19cec71?w=400',
        description: 'Purified and mineral-balanced drinking water.'
      },
      {
        name: 'Coca-Cola Original 330ml Can',
        sku: 'COKE-CAN-330',
        barcode: '60010014',
        categoryCode: 'BEVERAGE',
        brandName: 'Coca-Cola',
        unitSymbol: 'can',
        supplierId: sFmcg,
        costPrice: 0.45,
        sellingPrice: 0.75,
        taxRate: 5,
        currentStock: 150,
        minStockLevel: 30,
        maxStockLevel: 400,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 270,
        imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400',
        description: 'Refreshing carbonated soft drink chilled aluminum can.'
      },
      {
        name: 'Fanta Orange Soda 330ml Can',
        sku: 'FANTA-CAN-330',
        barcode: '60010015',
        categoryCode: 'BEVERAGE',
        brandName: 'Coca-Cola',
        unitSymbol: 'can',
        supplierId: sFmcg,
        costPrice: 0.45,
        sellingPrice: 0.75,
        taxRate: 5,
        currentStock: 130,
        minStockLevel: 25,
        maxStockLevel: 350,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 270,
        imageUrl: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=400',
        description: 'Fruity vibrant orange sparkling soda.'
      },
      {
        name: 'Vimto Original Fruit Cordial 710ml',
        sku: 'VIMTO-710ML',
        barcode: '60010016',
        categoryCode: 'BEVERAGE',
        brandName: 'Vimto',
        unitSymbol: 'btl',
        supplierId: sFmcg,
        costPrice: 2.4,
        sellingPrice: 3.5,
        taxRate: 5,
        currentStock: 70,
        minStockLevel: 15,
        maxStockLevel: 150,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 360,
        imageUrl: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400',
        description: 'Classic British-heritage berry and herbal cordial drink.'
      },
      {
        name: 'Lipton Yellow Label Black Tea (100 Bags)',
        sku: 'LIPTON-100',
        barcode: '60010017',
        categoryCode: 'BEVERAGE',
        brandName: 'Lipton',
        unitSymbol: 'box',
        supplierId: sAlBarka,
        costPrice: 2.75,
        sellingPrice: 4.1,
        taxRate: 5,
        currentStock: 85,
        minStockLevel: 15,
        maxStockLevel: 200,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 450,
        imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400',
        description: 'Rich blend of sun-ripened tea leaves.'
      },

      // COOKING & OILS
      {
        name: 'Afia Pure Corn Cooking Oil 3L',
        sku: 'OIL-CORN-3L',
        barcode: '60010018',
        categoryCode: 'OILS',
        brandName: 'Afia',
        unitSymbol: 'btl',
        supplierId: sHormuud,
        costPrice: 5.4,
        sellingPrice: 7.2,
        taxRate: 5,
        currentStock: 60,
        minStockLevel: 15,
        maxStockLevel: 150,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 360,
        imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400',
        description: 'Heart-healthy cholesterol-free pure corn oil.'
      },
      {
        name: 'Afia Sunflower Cooking Oil 1.5L',
        sku: 'OIL-SUN-15L',
        barcode: '60010019',
        categoryCode: 'OILS',
        brandName: 'Afia',
        unitSymbol: 'btl',
        supplierId: sHormuud,
        costPrice: 2.85,
        sellingPrice: 4.0,
        taxRate: 5,
        currentStock: 75,
        minStockLevel: 15,
        maxStockLevel: 180,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 360,
        imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400',
        description: 'Light and golden refined sunflower frying oil.'
      },

      // CANNED FOODS
      {
        name: 'Al-Barka Chunk Light Tuna in Oil 185g',
        sku: 'TUNA-185G',
        barcode: '60010020',
        categoryCode: 'CANNED',
        brandName: 'Bakhresa Group',
        unitSymbol: 'can',
        supplierId: sAlBarka,
        costPrice: 1.1,
        sellingPrice: 1.7,
        taxRate: 5,
        currentStock: 95,
        minStockLevel: 20,
        maxStockLevel: 250,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 500,
        imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400',
        description: 'Wild-caught yellowfin tuna packed in pure vegetable oil.'
      },
      {
        name: 'Double Concentrated Tomato Paste 400g',
        sku: 'TOMATO-PASTE-400',
        barcode: '60010021',
        categoryCode: 'CANNED',
        brandName: 'Bakhresa Group',
        unitSymbol: 'can',
        supplierId: sFmcg,
        costPrice: 0.65,
        sellingPrice: 1.1,
        taxRate: 5,
        currentStock: 140,
        minStockLevel: 25,
        maxStockLevel: 300,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 500,
        imageUrl: 'https://images.unsplash.com/photo-1582515073490-39981397c445?w=400',
        description: 'Rich ripe Mediterranean tomato puree for Somali suqaar and sauces.'
      },
      {
        name: 'California Garden Fava Beans (Ful) 400g',
        sku: 'FAVA-BEANS-400',
        barcode: '60010022',
        categoryCode: 'CANNED',
        brandName: 'Bakhresa Group',
        unitSymbol: 'can',
        supplierId: sFmcg,
        costPrice: 0.6,
        sellingPrice: 1.0,
        taxRate: 5,
        currentStock: 120,
        minStockLevel: 20,
        maxStockLevel: 250,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 450,
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
        description: 'Ready-to-eat seasoned fava beans for breakfast ful.'
      },

      // FRESH PRODUCE (with 2 low stock items)
      {
        name: 'Fresh Sweet Bananas (Afgooye) 1kg',
        sku: 'BANANA-1KG',
        barcode: '60010023',
        categoryCode: 'PRODUCE',
        brandName: 'SomFresh Dairy',
        unitSymbol: 'kg',
        supplierId: sSomFresh,
        costPrice: 0.5,
        sellingPrice: 0.9,
        taxRate: 0,
        currentStock: 4, // LOW STOCK ALERT! (min 15)
        minStockLevel: 15,
        maxStockLevel: 100,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 5,
        imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400',
        description: 'Locally grown Afgooye ripe sweet bananas.'
      },
      {
        name: 'Fresh Red Salad Tomatoes 1kg',
        sku: 'TOMATO-FRESH-1KG',
        barcode: '60010024',
        categoryCode: 'PRODUCE',
        brandName: 'SomFresh Dairy',
        unitSymbol: 'kg',
        supplierId: sSomFresh,
        costPrice: 0.7,
        sellingPrice: 1.2,
        taxRate: 0,
        currentStock: 3, // LOW STOCK ALERT! (min 20)
        minStockLevel: 20,
        maxStockLevel: 120,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 6,
        imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400',
        description: 'Crisp field-grown fresh red vine tomatoes.'
      },
      {
        name: 'Red Cooking Onions 1kg',
        sku: 'ONION-RED-1KG',
        barcode: '60010025',
        categoryCode: 'PRODUCE',
        brandName: 'SomFresh Dairy',
        unitSymbol: 'kg',
        supplierId: sSomFresh,
        costPrice: 0.8,
        sellingPrice: 1.3,
        taxRate: 0,
        currentStock: 65,
        minStockLevel: 15,
        maxStockLevel: 150,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 30,
        imageUrl: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=400',
        description: 'Dry firm pungent red cooking onions.'
      },
      {
        name: 'White Potatoes Bag 2kg',
        sku: 'POTATO-2KG',
        barcode: '60010026',
        categoryCode: 'PRODUCE',
        brandName: 'SomFresh Dairy',
        unitSymbol: 'pk',
        supplierId: sSomFresh,
        costPrice: 1.2,
        sellingPrice: 2.0,
        taxRate: 0,
        currentStock: 55,
        minStockLevel: 12,
        maxStockLevel: 120,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 35,
        imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400',
        description: 'Washed all-purpose baking and frying potatoes.'
      },

      // BAKERY & BREAKFAST
      {
        name: 'Bakhresa Fresh Sliced Bread 500g',
        sku: 'BREAD-TOAST-500',
        barcode: '60010027',
        categoryCode: 'BAKERY',
        brandName: 'Bakhresa Group',
        unitSymbol: 'pk',
        supplierId: sHormuud,
        costPrice: 0.8,
        sellingPrice: 1.25,
        taxRate: 0,
        currentStock: 45,
        minStockLevel: 10,
        maxStockLevel: 100,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 4,
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
        description: 'Soft white sandwich sliced toast loaf.'
      },
      {
        name: 'Somali Beef Sambusa Pack (10 pcs)',
        sku: 'SAMBUSA-10PCS',
        barcode: '60010028',
        categoryCode: 'BAKERY',
        brandName: 'SomFresh Dairy',
        unitSymbol: 'box',
        supplierId: sSomFresh,
        costPrice: 2.2,
        sellingPrice: 3.5,
        taxRate: 5,
        currentStock: 30,
        minStockLevel: 8,
        maxStockLevel: 60,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 3,
        imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',
        description: 'Crispy fried Somali sambusa stuffed with spiced minced meat.'
      },

      // SNACKS & SWEETS
      {
        name: 'McVities Digestive Biscuits 400g',
        sku: 'BISCUITS-DIGESTIVE',
        barcode: '60010029',
        categoryCode: 'SNACKS',
        brandName: 'Bakhresa Group',
        unitSymbol: 'pk',
        supplierId: sFmcg,
        costPrice: 1.1,
        sellingPrice: 1.8,
        taxRate: 5,
        currentStock: 75,
        minStockLevel: 15,
        maxStockLevel: 180,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 220,
        imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400',
        description: 'Wheatmeal wholesome digestive tea biscuits.'
      },
      {
        name: 'Lays Classic Salted Potato Chips 150g',
        sku: 'CHIPS-POTATO-150',
        barcode: '60010030',
        categoryCode: 'SNACKS',
        brandName: 'Coca-Cola',
        unitSymbol: 'pk',
        supplierId: sFmcg,
        costPrice: 0.75,
        sellingPrice: 1.4,
        taxRate: 5,
        currentStock: 65,
        minStockLevel: 15,
        maxStockLevel: 150,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 120,
        imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400',
        description: 'Crispy salted golden potato crisps.'
      },

      // CLEANING & HOUSEHOLD
      {
        name: 'Omo Multi-Active Detergent Powder 1kg',
        sku: 'OMO-1KG',
        barcode: '60010031',
        categoryCode: 'CLEANING',
        brandName: 'Omo',
        unitSymbol: 'pk',
        supplierId: sBarwaaqo,
        costPrice: 2.2,
        sellingPrice: 3.2,
        taxRate: 5,
        currentStock: 90,
        minStockLevel: 20,
        maxStockLevel: 250,
        isExpiringProduct: false,
        trackBatch: false,
        imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400',
        description: 'Deep stain removal power laundry washing powder.'
      },
      {
        name: 'Sunlight Lemon Dishwashing Liquid 750ml',
        sku: 'SUNLIGHT-750ML',
        barcode: '60010032',
        categoryCode: 'CLEANING',
        brandName: 'Sunlight',
        unitSymbol: 'btl',
        supplierId: sBarwaaqo,
        costPrice: 1.3,
        sellingPrice: 2.1,
        taxRate: 5,
        currentStock: 100,
        minStockLevel: 20,
        maxStockLevel: 250,
        isExpiringProduct: false,
        trackBatch: false,
        imageUrl: 'https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?w=400',
        description: 'Tough grease cutting dishwashing lemon formula.'
      },

      // PERSONAL CARE
      {
        name: 'Colgate Total 12 Clean Mint Toothpaste 100ml',
        sku: 'COLGATE-100ML',
        barcode: '60010033',
        categoryCode: 'HYGIENE',
        brandName: 'Colgate',
        unitSymbol: 'pcs',
        supplierId: sBarwaaqo,
        costPrice: 1.2,
        sellingPrice: 1.9,
        taxRate: 5,
        currentStock: 110,
        minStockLevel: 20,
        maxStockLevel: 300,
        isExpiringProduct: true,
        trackBatch: true,
        daysToExpiry: 450,
        imageUrl: 'https://images.unsplash.com/photo-1559591937-e160a0a996f0?w=400',
        description: 'Antibacterial fluoride toothpaste for whole mouth protection.'
      }
    ];

    const createdProducts: any[] = [];
    for (const p of productsDef) {
      const categoryId = catMap.get(p.categoryCode);
      const brandId = brandMap.get(p.brandName);
      const unitId = unitMap.get(p.unitSymbol);

      const prodDoc = await Product.create({
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        category: categoryId,
        brand: brandId,
        unit: unitId,
        defaultSupplier: p.supplierId,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        taxRate: p.taxRate,
        currentStock: p.currentStock,
        minStockLevel: p.minStockLevel,
        maxStockLevel: p.maxStockLevel,
        isExpiringProduct: p.isExpiringProduct,
        trackBatch: p.trackBatch,
        description: p.description,
        imageUrl: p.imageUrl,
        isArchived: false
      });
      createdProducts.push(prodDoc);

      // Create InventoryLot and initial StockMovement
      if (p.trackBatch || p.currentStock > 0) {
        const expDate = p.daysToExpiry
          ? new Date(Date.now() + p.daysToExpiry * 24 * 60 * 60 * 1000)
          : undefined;

        const lot = await InventoryLot.create({
          productId: prodDoc._id,
          batchNumber: `LOT-${p.sku}-${new Date().getFullYear()}`,
          quantityReceived: p.currentStock,
          remainingQuantity: p.currentStock,
          unitCost: p.costPrice,
          expirationDate: expDate,
          receivedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          supplierId: p.supplierId,
          status: 'active',
          notes: 'Standard warehouse batch initial receipt'
        });

        await StockMovement.create({
          productId: prodDoc._id,
          lotId: lot._id,
          movementType: 'ADJUSTMENT',
          quantity: p.currentStock,
          previousStock: 0,
          newStock: p.currentStock,
          unitCost: p.costPrice,
          reason: 'Initial store inventory batch intake',
          performedBy: adminUser._id
        });
      }
    }
    logger.info(`✅ ${createdProducts.length} Products and initial Lots/StockMovements created.`);

    // 8. Customers
    const customersData = [
      {
        name: 'Guled Abdi Hassan',
        phone: '+252 61 8111222',
        email: 'guled.abdi@gmail.com',
        address: 'Waberi District, Mogadishu',
        loyaltyPoints: 340,
        totalSpent: 420.5,
        outstandingBalance: 0
      },
      {
        name: 'Maryan Sheikh Dahir',
        phone: '+252 61 8222333',
        email: 'maryan.sheikh@hotmail.com',
        address: 'Hodan KM4, Mogadishu',
        loyaltyPoints: 580,
        totalSpent: 750.0,
        outstandingBalance: 0
      },
      {
        name: 'Abdullahi Farah Nur',
        phone: '+252 61 8333444',
        email: 'abdullahi.farah@gmail.com',
        address: 'Howlwadaag, Mogadishu',
        loyaltyPoints: 120,
        totalSpent: 165.0,
        outstandingBalance: 0
      },
      {
        name: 'Amina Mohamed Warsame',
        phone: '+252 61 8444555',
        email: 'amina.warsame@yahoo.com',
        address: 'Kaaran, Mogadishu',
        loyaltyPoints: 490,
        totalSpent: 620.0,
        outstandingBalance: 0
      },
      {
        name: 'Liban Yusuf Ahmed',
        phone: '+252 61 8555667',
        email: 'liban.yusuf@gmail.com',
        address: 'Hamar Weyne, Mogadishu',
        loyaltyPoints: 85,
        totalSpent: 110.0,
        outstandingBalance: 0
      },
      {
        name: 'Fardowsa Nur Elmi',
        phone: '+252 61 8666778',
        email: 'fardowsa.elmi@gmail.com',
        address: 'Shibis, Mogadishu',
        loyaltyPoints: 215,
        totalSpent: 280.0,
        outstandingBalance: 0
      },
      {
        name: 'Ahmed Hassan Gelle',
        phone: '+252 61 8777889',
        email: 'ahmed.gelle@gmail.com',
        address: 'Yaqshid, Mogadishu',
        loyaltyPoints: 310,
        totalSpent: 395.0,
        outstandingBalance: 0
      },
      {
        name: 'Deqa Ali Barre',
        phone: '+252 61 8888990',
        email: 'deqa.barre@gmail.com',
        address: 'Dayniile, Mogadishu',
        loyaltyPoints: 95,
        totalSpent: 130.0,
        outstandingBalance: 0
      }
    ];
    const customerDocs = await Customer.insertMany(customersData);
    logger.info(`✅ ${customerDocs.length} Customers created.`);

    // 9. Coupons
    const couponsData = [
      {
        code: 'WELCOME10',
        description: '10% discount on orders over $15',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValue: 15,
        maxDiscount: 5,
        expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        usageLimit: 200,
        timesUsed: 14,
        isActive: true
      },
      {
        code: 'RAMADAN5',
        description: '$5 flat off on family purchases over $50',
        discountType: 'FIXED_AMOUNT',
        discountValue: 5,
        minOrderValue: 50,
        expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        usageLimit: 150,
        timesUsed: 8,
        isActive: true
      }
    ];
    await Coupon.insertMany(couponsData);
    logger.info('✅ Promotional coupons created.');

    // 10. Cashier Shifts
    // Past closed shifts
    const shift1 = await CashierShift.create({
      shiftNumber: 'SH-20261029-01',
      cashierId: cashierUser._id,
      openedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 8 * 3600 * 1000),
      openingCash: 100,
      totalSalesCash: 240,
      totalCashPayIn: 0,
      totalCashPayOut: 0,
      totalCashDrop: 200,
      expectedCash: 140,
      countedCash: 140,
      cashDiscrepancy: 0,
      paymentMethodSummaries: [
        { method: 'CASH', totalAmount: 240, transactionCount: 6 },
        { method: 'EVC_PLUS', totalAmount: 310, transactionCount: 8 },
        { method: 'EDAHAB', totalAmount: 120, transactionCount: 3 }
      ],
      status: 'approved',
      notes: 'Smooth morning shift, perfect cash match.'
    });

    const shift2 = await CashierShift.create({
      shiftNumber: 'SH-20261030-01',
      cashierId: cashierUser._id,
      openedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 8 * 3600 * 1000),
      openingCash: 100,
      totalSalesCash: 315,
      totalCashPayIn: 0,
      totalCashPayOut: 0,
      totalCashDrop: 250,
      expectedCash: 165,
      countedCash: 165,
      cashDiscrepancy: 0,
      paymentMethodSummaries: [
        { method: 'CASH', totalAmount: 315, transactionCount: 7 },
        { method: 'EVC_PLUS', totalAmount: 450, transactionCount: 11 },
        { method: 'ZAAD', totalAmount: 95, transactionCount: 2 }
      ],
      status: 'approved',
      notes: 'High volume afternoon shift.'
    });

    // Current ACTIVE OPEN Shift for Hassan Cashier (so POS is ready to use immediately!)
    const activeShift = await CashierShift.create({
      shiftNumber: `SH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`,
      cashierId: cashierUser._id,
      openedAt: new Date(),
      openingCash: 150,
      totalSalesCash: 185,
      totalCashPayIn: 0,
      totalCashPayOut: 0,
      totalCashDrop: 0,
      expectedCash: 335,
      paymentMethodSummaries: [
        { method: 'CASH', totalAmount: 185, transactionCount: 4 },
        { method: 'EVC_PLUS', totalAmount: 220, transactionCount: 5 }
      ],
      status: 'open',
      notes: 'Active register drawer for current session.'
    });
    logger.info('✅ Historical & Active Cashier Shifts created.');

    // 11. Realistic Sales Transactions (Past 7 days + Today)
    logger.info('💳 Generating realistic itemized sales transactions...');
    const paymentMethods = ['EVC_PLUS', 'EDAHAB', 'ZAAD', 'CASH', 'CARD'] as const;

    const salesToInsert: any[] = [];
    const baseDate = new Date();

    // Generate 28 transactions across 7 days (4 per day)
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const salesCountForDay = dayOffset === 0 ? 5 : 4; // 5 sales today
      for (let s = 1; s <= salesCountForDay; s++) {
        const saleDate = new Date(baseDate);
        saleDate.setDate(saleDate.getDate() - dayOffset);
        saleDate.setHours(9 + s * 2, (s * 13) % 60, (s * 27) % 60);

        // Pick 2 to 4 random products
        const itemCount = 2 + ((s + dayOffset) % 3);
        const selectedProducts = createdProducts
          .slice((s * 3) % (createdProducts.length - 5), ((s * 3) % (createdProducts.length - 5)) + itemCount);

        let subtotal = 0;
        let taxTotal = 0;
        const items = selectedProducts.map(p => {
          const qty = 1 + ((s + dayOffset) % 3);
          const lineSub = p.sellingPrice * qty;
          const lineTax = Number((lineSub * (p.taxRate / 100)).toFixed(2));
          const lineTot = Number((lineSub + lineTax).toFixed(2));
          subtotal += lineSub;
          taxTotal += lineTax;

          return {
            productId: p._id,
            productName: p.name,
            sku: p.sku,
            barcode: p.barcode,
            quantity: qty,
            unitPrice: p.sellingPrice,
            costPrice: p.costPrice,
            discount: 0,
            taxRate: p.taxRate,
            taxAmount: lineTax,
            subtotal: Number(lineSub.toFixed(2)),
            total: lineTot,
            allocatedLots: [
              {
                lotId: new mongoose.Types.ObjectId(),
                batchNumber: `LOT-${p.sku}-${new Date().getFullYear()}`,
                quantity: qty,
                unitCost: p.costPrice
              }
            ]
          };
        });

        subtotal = Number(subtotal.toFixed(2));
        taxTotal = Number(taxTotal.toFixed(2));
        const grandTotal = Number((subtotal + taxTotal).toFixed(2));
        const selectedMethod = paymentMethods[(s + dayOffset) % paymentMethods.length];
        const selectedCustomer = customerDocs[(s + dayOffset) % customerDocs.length];
        const shiftId = dayOffset === 0 ? activeShift._id : (dayOffset === 1 ? shift2._id : shift1._id);

        const receiptIndex = `${7 - dayOffset}${s}`.padStart(4, '0');
        const receiptNumber = `REC-${saleDate.toISOString().slice(0, 10).replace(/-/g, '')}-${receiptIndex}`;

        salesToInsert.push({
          receiptNumber,
          cashierId: cashierUser._id,
          shiftId,
          customerId: selectedCustomer._id,
          items,
          subtotal,
          taxTotal,
          discountTotal: 0,
          grandTotal,
          payments: [
            {
              method: selectedMethod,
              amount: grandTotal,
              reference: selectedMethod !== 'CASH' ? `TXN-${Math.floor(10000000 + Math.random() * 90000000)}` : undefined
            }
          ],
          changeGiven: 0,
          paymentStatus: 'paid',
          status: 'completed',
          createdAt: saleDate,
          updatedAt: saleDate
        });
      }
    }

    await Sale.insertMany(salesToInsert);
    logger.info(`✅ ${salesToInsert.length} Realistic sales records inserted.`);

    // 12. Operating Expenses
    logger.info('📊 Recording realistic store operating expenses...');
    const expensesData = [
      {
        expenseNumber: 'EXP-202610-01',
        category: 'Utilities & Power',
        description: 'Diesel fuel for main supermarket backup generator (200L)',
        amount: 220.0,
        paymentMethod: 'EVC_PLUS',
        paidTo: 'Hass Petroleum Mogadishu',
        paidDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        recordedBy: adminUser._id
      },
      {
        expenseNumber: 'EXP-202610-02',
        category: 'Communications & Tech',
        description: 'Dedicated high-speed fiber internet for POS terminals',
        amount: 85.0,
        paymentMethod: 'EDAHAB',
        paidTo: 'Hormuud Telecom Somalia',
        paidDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        recordedBy: adminUser._id
      },
      {
        expenseNumber: 'EXP-202610-03',
        category: 'Maintenance & Repairs',
        description: 'Commercial cooling display maintenance and freon gas refill',
        amount: 140.0,
        paymentMethod: 'CASH',
        paidTo: 'Al-Baraka HVAC Techs',
        paidDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        recordedBy: managerUser._id
      },
      {
        expenseNumber: 'EXP-202610-04',
        category: 'Store Supplies',
        description: 'Custom branded biodegradable shopping bags (10,000 pcs)',
        amount: 180.0,
        paymentMethod: 'EVC_PLUS',
        paidTo: 'Bakaaro Plastic Packaging',
        paidDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        recordedBy: managerUser._id
      },
      {
        expenseNumber: 'EXP-202610-05',
        category: 'Security & Safety',
        description: 'Store physical security & CCTV system monthly monitoring',
        amount: 150.0,
        paymentMethod: 'ZAAD',
        paidTo: 'Shield Guard Services',
        paidDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        recordedBy: adminUser._id
      },
      {
        expenseNumber: 'EXP-202610-06',
        category: 'Stationery & POS Paper',
        description: 'Thermal receipt printer rolls (80mm x 50 rolls)',
        amount: 45.0,
        paymentMethod: 'CASH',
        paidTo: 'Mogadishu Office Stationery',
        paidDate: new Date(), // TODAY
        recordedBy: cashierUser._id
      },
      {
        expenseNumber: 'EXP-202610-07',
        category: 'Store Cleaning Supplies',
        description: 'Industrial floor detergent, mops, sanitizers and wipes',
        amount: 60.0,
        paymentMethod: 'EVC_PLUS',
        paidTo: 'Al-Nadiif Cleaning Essentials',
        paidDate: new Date(), // TODAY
        recordedBy: cashierUser._id
      }
    ];

    await Expense.insertMany(expensesData);
    logger.info(`✅ ${expensesData.length} Operating Expenses recorded.`);

    logger.info('🎉 ==============================================');
    logger.info('🎉 Supermarket database successfully enriched with rich data!');
    logger.info('🎉 ==============================================');
    logger.info(`Users Seeded:        ${createdUsers.length}`);
    logger.info(`Products Seeded:     ${createdProducts.length}`);
    logger.info(`Categories Seeded:   ${catDocs.length}`);
    logger.info(`Brands Seeded:       ${brandDocs.length}`);
    logger.info(`Suppliers Seeded:    ${supplierDocs.length}`);
    logger.info(`Customers Seeded:    ${customerDocs.length}`);
    logger.info(`Sales Recorded:      ${salesToInsert.length}`);
    logger.info(`Expenses Recorded:   ${expensesData.length}`);
    logger.info('🎉 ==============================================');

    await disconnectDB();
    process.exit(0);
  } catch (err: any) {
    logger.error('❌ Error during rich seeding: ' + err.message, { stack: err.stack });
    process.exit(1);
  }
}

seedRichData();
