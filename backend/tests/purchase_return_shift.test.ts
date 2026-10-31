import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Category } from '../src/models/Category';
import { Unit } from '../src/models/Unit';
import { Product } from '../src/models/Product';
import { Supplier } from '../src/models/Supplier';
import { Sale } from '../src/models/Sale';
import { Expense } from '../src/models/Expense';
import { CashierShift } from '../src/models/CashierShift';
import { ReportService } from '../src/services/report.service';
import { hashPassword } from '../src/utils/crypto';
import { signAccessToken } from '../src/utils/jwt';
import { UserRole } from '../src/types/roles';

const app = createApp();

describe('Purchases, Returns, Shifts, and Financial Reports', () => {
  let adminToken: string;
  let adminId: string;
  let supplierId: string;
  let productId: string;

  beforeEach(async () => {
    const admin = await User.create({
      name: 'Operations Manager',
      email: 'admin@supermarket.local',
      passwordHash: await hashPassword('AdminPass123!'),
      role: UserRole.ADMIN,
      status: 'active'
    });
    adminId = (admin._id as any).toString();
    adminToken = signAccessToken({ id: adminId, email: admin.email, role: admin.role });

    const supplier = await Supplier.create({
      name: 'Wholesale Rep',
      companyName: 'Apex Foods Ltd',
      phone: '+252 61 9999999'
    });
    supplierId = (supplier._id as any).toString();

    const category = await Category.create({ name: 'Pantry', code: 'PANTRY' });
    const unit = await Unit.create({ name: 'Pieces', symbol: 'pcs', precision: 0 });

    const prod = await Product.create({
      name: 'Olive Oil 1L',
      sku: 'OIL-OLV-1L',
      barcode: '7890123456789',
      category: category._id,
      unit: unit._id,
      costPrice: 6.0,
      sellingPrice: 10.0,
      currentStock: 10
    });
    productId = (prod._id as any).toString();
  });

  it('Purchases - creating PO must NOT increase stock, receiving PO MUST increase stock', async () => {
    // 1. Create Purchase Order for 25 units
    const createRes = await request(app)
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId,
        items: [{ productId, orderedQuantity: 25, unitCost: 6.0 }]
      });

    expect(createRes.status).toBe(201);
    const purchaseId = createRes.body.data._id;
    expect(createRes.body.data.status).toBe('draft');

    // Stock must remain unchanged at 10!
    const stockAfterCreate = await Product.findById(productId);
    expect(stockAfterCreate?.currentStock).toBe(10);

    // 2. Receive 15 units (Partial Receiving)
    const receiveRes = await request(app)
      .post(`/api/v1/purchases/${purchaseId}/receive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        receivedItems: [{ productId, receivedQuantity: 15, batchNumber: 'LOT-PARTIAL-1' }]
      });

    expect(receiveRes.status).toBe(200);
    expect(receiveRes.body.data.status).toBe('partially_received');

    // Stock must increase by 15 to 25
    const stockAfterReceive = await Product.findById(productId);
    expect(stockAfterReceive?.currentStock).toBe(25);
  });

  it('Returns - customer return with restock condition should refund and restore stock', async () => {
    // 1. Create sale for 4 units
    const sale = await Sale.create({
      receiptNumber: 'REC-RETURN-TEST',
      cashierId: adminId,
      items: [
        {
          productId,
          productName: 'Olive Oil 1L',
          sku: 'OIL-OLV-1L',
          barcode: '7890123456789',
          quantity: 4,
          unitPrice: 10.0,
          costPrice: 6.0,
          discount: 0,
          taxRate: 0,
          taxAmount: 0,
          subtotal: 40.0,
          total: 40.0,
          allocatedLots: []
        }
      ],
      subtotal: 40.0,
      grandTotal: 40.0,
      payments: [{ method: 'CASH', amount: 40.0 }],
      status: 'completed'
    });

    // 2. Return 2 units with 'resellable' and 'restocked' disposition
    const returnRes = await request(app)
      .post(`/api/v1/returns/sales/${sale._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            productId,
            quantity: 2,
            condition: 'resellable',
            disposition: 'restocked',
            returnReason: 'Customer bought duplicate by mistake'
          }
        ],
        refundMethod: 'CASH'
      });

    expect(returnRes.status).toBe(201);
    expect(returnRes.body.data.totalRefundAmount).toBe(20.0);

    // Stock should be increased by 2 (from 10 to 12)
    const stockAfterReturn = await Product.findById(productId);
    expect(stockAfterReturn?.currentStock).toBe(12);
  });

  it('Cashier Shifts - should balance opening, movements, sales, and closing counted cash', async () => {
    // 1. Open shift with $100 opening cash
    const openRes = await request(app)
      .post('/api/v1/cash-shifts/open')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ openingCash: 100 });

    expect(openRes.status).toBe(201);
    const shiftId = openRes.body.data._id;

    // 2. Add Pay-in of $50 (e.g. change fund top-up)
    await request(app)
      .post(`/api/v1/cash-shifts/${shiftId}/cash-movements`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ movementType: 'PAY_IN', amount: 50, reason: 'Small bill drawer top-up' });

    // 3. Add Safe Drop of $30
    await request(app)
      .post(`/api/v1/cash-shifts/${shiftId}/cash-movements`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ movementType: 'DROP', amount: 30, reason: 'Midday safe cash drop' });

    // Expected cash: $100 + $50 - $30 = $120.00
    // Cashier counts $125.00 (Discrepancy: +$5.00 surplus)
    const closeRes = await request(app)
      .post(`/api/v1/cash-shifts/${shiftId}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ countedCash: 125, notes: 'Drawer surplus of $5.00' });

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.expectedCash).toBe(120);
    expect(closeRes.body.data.countedCash).toBe(125);
    expect(closeRes.body.data.cashDiscrepancy).toBe(5);
    expect(closeRes.body.data.status).toBe('closed');
  });

  it('Financial Reports - Profit & Loss calculation distinguishing Gross, COGS, and Operating Expenses', async () => {
    // Create Sale: 10 units at $10 = $100 Gross Sales, COGS = 10 * $6 = $60
    await Sale.create({
      receiptNumber: 'REC-FIN-1',
      cashierId: adminId,
      items: [
        {
          productId,
          productName: 'Olive Oil 1L',
          sku: 'OIL-OLV-1L',
          barcode: '7890123456789',
          quantity: 10,
          unitPrice: 10.0,
          costPrice: 6.0,
          discount: 0,
          taxRate: 0,
          taxAmount: 0,
          subtotal: 100.0,
          total: 100.0,
          allocatedLots: []
        }
      ],
      subtotal: 100.0,
      discountTotal: 10.0, // $10 discount
      grandTotal: 90.0,
      payments: [{ method: 'CASH', amount: 90.0 }],
      status: 'completed'
    });

    // Create Expense: $15.00 store utility bill
    await Expense.create({
      expenseNumber: 'EXP-FIN-1',
      category: 'Utilities',
      description: 'Electricity for store cooler',
      amount: 15.0,
      paymentMethod: 'CASH',
      paidTo: 'Electric Utility Co',
      recordedBy: adminId
    });

    // Calculate P&L:
    // Gross Sales = $100.00
    // Total Discounts = $10.00
    // Refunds = $0.00
    // Net Sales = $100 - $10 = $90.00
    // COGS = 10 * $6.00 = $60.00
    // Gross Profit = $90.00 - $60.00 = $30.00
    // Operating Expenses = $15.00
    // Net Operating Result = $30.00 - $15.00 = $15.00
    const profitReport = await ReportService.getProfitReport();

    expect(profitReport.metrics.grossSales).toBe(100.0);
    expect(profitReport.metrics.totalDiscounts).toBe(10.0);
    expect(profitReport.metrics.netSales).toBe(90.0);
    expect(profitReport.metrics.costOfGoodsSold).toBe(60.0);
    expect(profitReport.metrics.grossProfit).toBe(30.0);
    expect(profitReport.metrics.operatingExpenses).toBe(15.0);
    expect(profitReport.metrics.netOperatingResult).toBe(15.0);
  });
});
