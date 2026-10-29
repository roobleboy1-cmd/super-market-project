import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Category } from '../src/models/Category';
import { Unit } from '../src/models/Unit';
import { Product } from '../src/models/Product';
import { InventoryLot } from '../src/models/InventoryLot';
import { StockMovement } from '../src/models/StockMovement';
import { InventoryService } from '../src/services/inventory.service';
import { hashPassword } from '../src/utils/crypto';
import { signAccessToken } from '../src/utils/jwt';
import { UserRole } from '../src/types/roles';

const app = createApp();

describe('Inventory & FEFO Batch Allocation', () => {
  let adminToken: string;
  let adminId: string;
  let productId: string;

  beforeEach(async () => {
    const admin = await User.create({
      name: 'Inventory Lead',
      email: 'admin@supermarket.local',
      passwordHash: await hashPassword('AdminPass123!'),
      role: UserRole.ADMIN,
      status: 'active'
    });
    adminId = (admin._id as any).toString();
    adminToken = signAccessToken({ id: adminId, email: admin.email, role: admin.role });

    const category = await Category.create({ name: 'Fresh', code: 'FRESH' });
    const unit = await Unit.create({ name: 'Pieces', symbol: 'pcs', precision: 0 });

    const product = await Product.create({
      name: 'Yogurt Strawberry 200g',
      sku: 'YOG-STR-200',
      barcode: '1111112222223',
      category: category._id,
      unit: unit._id,
      costPrice: 0.6,
      sellingPrice: 1.2,
      currentStock: 50,
      minStockLevel: 10,
      isExpiringProduct: true
    });
    productId = (product._id as any).toString();
  });

  it('FEFO Allocation - should allocate earliest expiring active batch first', async () => {
    const now = Date.now();
    const dateIn10Days = new Date(now + 10 * 24 * 60 * 60 * 1000);
    const dateIn40Days = new Date(now + 40 * 24 * 60 * 60 * 1000);

    // Create Lot 1 (expires in 40 days, qty 15)
    await InventoryLot.create({
      productId,
      batchNumber: 'BATCH-LATER',
      quantityReceived: 15,
      remainingQuantity: 15,
      unitCost: 0.6,
      expirationDate: dateIn40Days,
      status: 'active'
    });

    // Create Lot 2 (expires in 10 days, qty 10)
    await InventoryLot.create({
      productId,
      batchNumber: 'BATCH-SOON',
      quantityReceived: 10,
      remainingQuantity: 10,
      unitCost: 0.6,
      expirationDate: dateIn10Days,
      status: 'active'
    });

    // Request 12 units
    const allocations = await InventoryService.allocateLotsFEFO(productId, 12);

    expect(allocations.length).toBe(2);
    // 1st allocation must come from BATCH-SOON (10 units)
    expect(allocations[0].batchNumber).toBe('BATCH-SOON');
    expect(allocations[0].quantity).toBe(10);

    // 2nd allocation must take remainder (2 units) from BATCH-LATER
    expect(allocations[1].batchNumber).toBe('BATCH-LATER');
    expect(allocations[1].quantity).toBe(2);

    // Verify remaining quantities in DB
    const lotSoon = await InventoryLot.findOne({ batchNumber: 'BATCH-SOON' });
    expect(lotSoon?.remainingQuantity).toBe(0);
    expect(lotSoon?.status).toBe('depleted');

    const lotLater = await InventoryLot.findOne({ batchNumber: 'BATCH-LATER' });
    expect(lotLater?.remainingQuantity).toBe(13);
  });

  it('Prevention of selling expired stock - should never allocate expired lot', async () => {
    const expiredDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await InventoryLot.create({
      productId,
      batchNumber: 'BATCH-EXPIRED',
      quantityReceived: 20,
      remainingQuantity: 20,
      unitCost: 0.6,
      expirationDate: expiredDate,
      status: 'active'
    });

    await InventoryLot.create({
      productId,
      batchNumber: 'BATCH-FRESH',
      quantityReceived: 10,
      remainingQuantity: 10,
      unitCost: 0.6,
      expirationDate: futureDate,
      status: 'active'
    });

    const allocations = await InventoryService.allocateLotsFEFO(productId, 5);

    // Only BATCH-FRESH should be allocated, never BATCH-EXPIRED
    expect(allocations.length).toBe(1);
    expect(allocations[0].batchNumber).toBe('BATCH-FRESH');
    expect(allocations[0].quantity).toBe(5);

    const expiredLot = await InventoryLot.findOne({ batchNumber: 'BATCH-EXPIRED' });
    expect(expiredLot?.remainingQuantity).toBe(20); // untouched
  });

  it('POST /api/v1/inventory/adjustments - should update stock and record StockMovement ledger', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/adjustments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId,
        quantity: -5,
        reason: 'DAMAGE',
        notes: 'Carton damaged during shelf restocking'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.product.currentStock).toBe(45); // 50 - 5

    // Verify StockMovement record
    const movement = await StockMovement.findOne({ productId });
    expect(movement).toBeDefined();
    expect(movement?.quantity).toBe(-5);
    expect(movement?.movementType).toBe('ADJUSTMENT');
    expect(movement?.previousStock).toBe(50);
    expect(movement?.newStock).toBe(45);
  });

  it('POST /api/v1/inventory/counts - should record physical count and update stock upon manager approval', async () => {
    // 1. Create Count
    const createRes = await request(app)
      .post('/api/v1/inventory/counts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ productId, countedStock: 52 }], // System is 50, physical is 52 (variance +2)
        notes: 'Monthly physical stock audit'
      });

    expect(createRes.status).toBe(201);
    const countId = createRes.body.data._id;
    expect(createRes.body.data.items[0].discrepancy).toBe(2);

    // 2. Submit Count
    const submitRes = await request(app)
      .post(`/api/v1/inventory/counts/${countId}/submit`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('submitted');

    // 3. Approve Count
    const approveRes = await request(app)
      .post(`/api/v1/inventory/counts/${countId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Variance verified and accepted' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('approved');

    // Verify product currentStock updated to counted stock 52
    const productAfter = await Product.findById(productId);
    expect(productAfter?.currentStock).toBe(52);
  });
});
