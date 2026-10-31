import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Category } from '../src/models/Category';
import { Unit } from '../src/models/Unit';
import { Product } from '../src/models/Product';
import { StoreSettings } from '../src/models/StoreSettings';
import { Sale } from '../src/models/Sale';
import { hashPassword } from '../src/utils/crypto';
import { signAccessToken } from '../src/utils/jwt';
import { UserRole } from '../src/types/roles';

const app = createApp();

describe('POS Checkout & Idempotency', () => {
  let cashierToken: string;
  let cashierId: string;
  let productAId: string;
  let productBId: string;

  beforeEach(async () => {
    // 1. Single Store Settings
    await StoreSettings.create({
      supermarketName: 'Single POS Supermarket',
      defaultTaxRate: 10,
      currency: 'USD'
    });

    // 2. Cashier User
    const cashier = await User.create({
      name: 'Ahmed Cashier',
      email: 'cashier@supermarket.local',
      passwordHash: await hashPassword('Cashier123!'),
      role: UserRole.CASHIER,
      status: 'active'
    });
    cashierId = (cashier._id as any).toString();
    cashierToken = signAccessToken({ id: cashierId, email: cashier.email, role: cashier.role });

    // 3. Category & Unit
    const category = await Category.create({ name: 'Groceries', code: 'GROC' });
    const unit = await Unit.create({ name: 'Pieces', symbol: 'pcs', precision: 0 });

    // 4. Products
    const prodA = await Product.create({
      name: 'Product Alpha',
      sku: 'SKU-ALPHA',
      barcode: '100000000001',
      category: category._id,
      unit: unit._id,
      costPrice: 5.0,
      sellingPrice: 10.0,
      taxRate: 10,
      currentStock: 20
    });
    productAId = (prodA._id as any).toString();

    const prodB = await Product.create({
      name: 'Product Beta',
      sku: 'SKU-BETA',
      barcode: '100000000002',
      category: category._id,
      unit: unit._id,
      costPrice: 2.0,
      sellingPrice: 4.0,
      taxRate: 10,
      currentStock: 15
    });
    productBId = (prodB._id as any).toString();
  });

  it('POST /api/v1/sales/checkout - should recalculate totals on server and deduct stock', async () => {
    const res = await request(app)
      .post('/api/v1/sales/checkout')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        items: [
          { productId: productAId, quantity: 2 }, // 2 * $10 = $20 subtotal, 10% tax = $2.00
          { productId: productBId, quantity: 1 }  // 1 * $4 = $4 subtotal, 10% tax = $0.40
        ],
        // Total subtotal: $24.00, Tax: $2.40, Grand Total: $26.40
        payments: [{ method: 'CASH', amount: 30.00 }] // Change: $3.60
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.subtotal).toBe(24.0);
    expect(res.body.data.taxTotal).toBe(2.4);
    expect(res.body.data.grandTotal).toBe(26.4);
    expect(res.body.data.changeGiven).toBe(3.6);
    expect(res.body.data.receiptNumber).toMatch(/^REC-/);

    // Verify stock deductions in DB
    const updatedProdA = await Product.findById(productAId);
    expect(updatedProdA?.currentStock).toBe(18); // 20 - 2

    const updatedProdB = await Product.findById(productBId);
    expect(updatedProdB?.currentStock).toBe(14); // 15 - 1
  });

  it('POST /api/v1/sales/checkout - should prevent duplicate sales via Idempotency Key', async () => {
    const idempotencyKey = 'UNIQUE_CLIENT_CHECKOUT_UUID_12345';

    const payload = {
      items: [{ productId: productAId, quantity: 3 }], // 3 * $10 = $30 + 10% tax ($3) = $33
      payments: [{ method: 'CARD', amount: 33.00, reference: 'TXN-9988' }],
      idempotencyKey
    };

    // 1st Attempt: should succeed and create sale
    const firstRes = await request(app)
      .post('/api/v1/sales/checkout')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send(payload);

    expect(firstRes.status).toBe(201);
    const receipt1 = firstRes.body.data.receiptNumber;

    const stockAfterFirst = await Product.findById(productAId);
    expect(stockAfterFirst?.currentStock).toBe(17); // 20 - 3

    // 2nd Attempt with SAME idempotency key (e.g. network retry or double-click)
    const secondRes = await request(app)
      .post('/api/v1/sales/checkout')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send(payload);

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.meta.isDuplicate).toBe(true);
    expect(secondRes.body.data.receiptNumber).toBe(receipt1);

    // Stock must NOT be deducted again!
    const stockAfterSecond = await Product.findById(productAId);
    expect(stockAfterSecond?.currentStock).toBe(17); // Still 17!
  });

  it('POST /api/v1/sales/checkout - should reject checkout if product is out of stock', async () => {
    const res = await request(app)
      .post('/api/v1/sales/checkout')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        items: [{ productId: productAId, quantity: 50 }], // Stock is only 20
        payments: [{ method: 'CASH', amount: 600.00 }]
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Insufficient stock');
  });

  it('POST /api/v1/sales/:id/void - should require manager permission, void sale, and restore stock', async () => {
    // 1. Checkout 4 units
    const checkoutRes = await request(app)
      .post('/api/v1/sales/checkout')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        items: [{ productId: productAId, quantity: 4 }],
        payments: [{ method: 'CASH', amount: 50.00 }]
      });

    const saleId = checkoutRes.body.data._id;
    const stockAfterSale = await Product.findById(productAId);
    expect(stockAfterSale?.currentStock).toBe(16); // 20 - 4

    // 2. Cashier tries to void without sales:void permission -> 403 Forbidden
    const cashierVoidRes = await request(app)
      .post(`/api/v1/sales/${saleId}/void`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ reason: 'Cashier attempt' });
    expect(cashierVoidRes.status).toBe(403);

    // 3. Manager/Admin voids the sale
    const manager = await User.create({
      name: 'Shift Manager',
      email: 'manager@supermarket.local',
      passwordHash: 'dummyhash',
      role: UserRole.MANAGER,
      status: 'active'
    });
    const managerToken = signAccessToken({
      id: (manager._id as any).toString(),
      email: manager.email,
      role: manager.role
    });

    const voidRes = await request(app)
      .post(`/api/v1/sales/${saleId}/void`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reason: 'Customer canceled payment authorization' });

    expect(voidRes.status).toBe(200);
    expect(voidRes.body.data.status).toBe('voided');

    // 4. Stock restored to 20
    const stockAfterVoid = await Product.findById(productAId);
    expect(stockAfterVoid?.currentStock).toBe(20);
  });
});
