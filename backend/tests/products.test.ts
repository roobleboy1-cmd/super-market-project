import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Category } from '../src/models/Category';
import { Unit } from '../src/models/Unit';
import { Product } from '../src/models/Product';
import { Sale } from '../src/models/Sale';
import { hashPassword } from '../src/utils/crypto';
import { signAccessToken } from '../src/utils/jwt';
import { UserRole } from '../src/types/roles';

const app = createApp();

describe('Products & Catalog Management', () => {
  let adminToken: string;
  let categoryId: string;
  let unitId: string;

  beforeEach(async () => {
    const admin = await User.create({
      name: 'Catalog Admin',
      email: 'admin@supermarket.local',
      passwordHash: await hashPassword('AdminPass123!'),
      role: UserRole.ADMIN,
      status: 'active'
    });

    adminToken = signAccessToken({
      id: (admin._id as any).toString(),
      email: admin.email,
      role: admin.role
    });

    const category = await Category.create({ name: 'Dairy', code: 'DAIRY' });
    categoryId = (category._id as any).toString();

    const unit = await Unit.create({ name: 'Pieces', symbol: 'pcs', precision: 0 });
    unitId = (unit._id as any).toString();
  });

  it('POST /api/v1/products - should create a product successfully', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Organic Whole Milk',
        sku: 'MILK-ORG-1L',
        barcode: '1234567890123',
        category: categoryId,
        unit: unitId,
        costPrice: 1.2,
        sellingPrice: 1.8,
        taxRate: 5,
        minStockLevel: 10
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sku).toBe('MILK-ORG-1L');
  });

  it('POST /api/v1/products - should prevent duplicate SKU and Barcode', async () => {
    await Product.create({
      name: 'Existing Milk',
      sku: 'MILK-DUPE',
      barcode: '9999999999999',
      category: categoryId,
      unit: unitId,
      costPrice: 1.0,
      sellingPrice: 1.5
    });

    // Attempt duplicate SKU
    const resDupeSku = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Another Milk',
        sku: 'MILK-DUPE',
        barcode: '8888888888888',
        category: categoryId,
        unit: unitId,
        costPrice: 1.0,
        sellingPrice: 1.5
      });

    expect(resDupeSku.status).toBe(409);
    expect(resDupeSku.body.error.code).toBe('CONFLICT');

    // Attempt duplicate Barcode
    const resDupeBarcode = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Another Milk',
        sku: 'MILK-DIFF',
        barcode: '9999999999999',
        category: categoryId,
        unit: unitId,
        costPrice: 1.0,
        sellingPrice: 1.5
      });

    expect(resDupeBarcode.status).toBe(409);
    expect(resDupeBarcode.body.error.code).toBe('CONFLICT');
  });

  it('DELETE /api/v1/products/:id - should archive instead of delete when product has sale history (Safe Retention)', async () => {
    const product = await Product.create({
      name: 'Historical Juice',
      sku: 'JUICE-HIST-1',
      barcode: '5555555555555',
      category: categoryId,
      unit: unitId,
      costPrice: 0.5,
      sellingPrice: 1.0
    });

    // Create historical sale referencing product
    await Sale.create({
      receiptNumber: 'REC-TEST-HIST',
      cashierId: categoryId, // Valid ObjectId
      items: [
        {
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          quantity: 2,
          unitPrice: 1.0,
          costPrice: 0.5,
          discount: 0,
          taxRate: 0,
          taxAmount: 0,
          subtotal: 2.0,
          total: 2.0,
          allocatedLots: []
        }
      ],
      subtotal: 2.0,
      grandTotal: 2.0,
      payments: [{ method: 'CASH', amount: 2.0 }],
      status: 'completed'
    });

    const res = await request(app)
      .delete(`/api/v1/products/${product._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isArchived).toBe(true);

    const productInDb = await Product.findById(product._id);
    expect(productInDb?.isArchived).toBe(true);
  });

  it('GET /api/v1/products/:id/barcode-label - should generate printable SVG barcode label', async () => {
    const product = await Product.create({
      name: 'Cheddar Cheese 200g',
      sku: 'CHEESE-200G',
      barcode: '7777777777777',
      category: categoryId,
      unit: unitId,
      costPrice: 2.0,
      sellingPrice: 3.5
    });

    const res = await request(app)
      .get(`/api/v1/products/${product._id}/barcode-label`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.svgLabel).toContain('<svg');
    expect(res.body.data.svgLabel).toContain('CHEESE-200G');
    expect(res.body.data.svgLabel).toContain('3.50');
  });
});
