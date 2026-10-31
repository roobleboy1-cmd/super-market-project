import mongoose from 'mongoose';
import { Sale } from '../models/Sale';
import { SaleReturn } from '../models/SaleReturn';
import { Purchase } from '../models/Purchase';
import { Expense } from '../models/Expense';
import { Product } from '../models/Product';
import { InventoryLot } from '../models/InventoryLot';
import { CashierShift } from '../models/CashierShift';
import { StoreSettings } from '../models/StoreSettings';

export class ReportService {
  /* ======================== DASHBOARD ======================== */

  static async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todaySalesAgg, todayExpensesAgg, totalProducts, lowStockCount, expiringCount] =
      await Promise.all([
        Sale.aggregate([
          { $match: { createdAt: { $gte: today }, status: { $ne: 'voided' } } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$grandTotal' },
              orderCount: { $sum: 1 }
            }
          }
        ]),
        Expense.aggregate([
          { $match: { paidDate: { $gte: today } } },
          { $group: { _id: null, totalExpense: { $sum: '$amount' } } }
        ]),
        Product.countDocuments({ isArchived: false }),
        Product.countDocuments({
          isArchived: false,
          $expr: { $lte: ['$currentStock', '$minStockLevel'] }
        }),
        InventoryLot.countDocuments({
          status: 'active',
          remainingQuantity: { $gt: 0 },
          expirationDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
        })
      ]);

    const todaySales = todaySalesAgg[0] || { totalRevenue: 0, orderCount: 0 };
    const todayExpenses = todayExpensesAgg[0]?.totalExpense || 0;

    return {
      todaySales: Number(todaySales.totalRevenue.toFixed(2)),
      todayOrders: todaySales.orderCount,
      todayExpenses: Number(todayExpenses.toFixed(2)),
      totalActiveProducts: totalProducts,
      lowStockAlerts: lowStockCount,
      expiringAlerts: expiringCount
    };
  }

  static async getSalesChart(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const chartData = await Sale.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: { $ne: 'voided' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalSales: { $sum: '$grandTotal' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return chartData.map((d) => ({
      date: d._id,
      totalSales: Number(d.totalSales.toFixed(2)),
      orders: d.orders
    }));
  }

  static async getRecentSales(limit = 10) {
    return Sale.find({ status: { $ne: 'voided' } })
      .populate('cashierId', 'name')
      .populate('customerId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  static async getTopProducts(limit = 5) {
    const top = await Sale.aggregate([
      { $match: { status: { $ne: 'voided' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          sku: { $first: '$items.sku' },
          totalQuantitySold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' }
        }
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: limit }
    ]);

    return top.map((t) => ({
      productId: t._id,
      productName: t.productName,
      sku: t.sku,
      totalQuantitySold: t.totalQuantitySold,
      totalRevenue: Number(t.totalRevenue.toFixed(2))
    }));
  }

  static async getDashboardAlerts() {
    const [lowStock, expiring] = await Promise.all([
      Product.find({
        isArchived: false,
        $expr: { $lte: ['$currentStock', '$minStockLevel'] }
      })
        .select('name sku currentStock minStockLevel')
        .limit(10)
        .lean(),
      InventoryLot.find({
        status: 'active',
        remainingQuantity: { $gt: 0 },
        expirationDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      })
        .populate('productId', 'name sku')
        .sort({ expirationDate: 1 })
        .limit(10)
        .lean()
    ]);

    return {
      lowStockProducts: lowStock,
      expiringLots: expiring
    };
  }

  /* ======================== DETAILED REPORTS ======================== */

  /**
   * Profit & Loss Report
   * Distinctly calculates: Gross Sales, Discounts, Refunds, Net Sales, COGS, Gross Profit, Expenses, Net Operating Result
   */
  static async getProfitReport(startDate?: string, endDate?: string) {
    const matchFilter: Record<string, any> = { status: { $ne: 'voided' } };
    const refundMatch: Record<string, any> = { status: 'completed' };
    const expenseMatch: Record<string, any> = {};

    if (startDate || endDate) {
      matchFilter.createdAt = {};
      refundMatch.createdAt = {};
      expenseMatch.paidDate = {};

      if (startDate) {
        const start = new Date(startDate);
        matchFilter.createdAt.$gte = start;
        refundMatch.createdAt.$gte = start;
        expenseMatch.paidDate.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        matchFilter.createdAt.$lte = end;
        refundMatch.createdAt.$lte = end;
        expenseMatch.paidDate.$lte = end;
      }
    }

    const [salesAgg, returnsAgg, expensesAgg] = await Promise.all([
      Sale.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            grossSales: { $sum: '$subtotal' },
            discounts: { $sum: '$discountTotal' },
            grandTotalRevenue: { $sum: '$grandTotal' },
            totalCOGS: {
              $sum: {
                $reduce: {
                  input: '$items',
                  initialValue: 0,
                  in: {
                    $add: [
                      '$$value',
                      { $multiply: ['$$this.costPrice', '$$this.quantity'] }
                    ]
                  }
                }
              }
            },
            orderCount: { $sum: 1 }
          }
        }
      ]),
      SaleReturn.aggregate([
        { $match: refundMatch },
        {
          $group: {
            _id: null,
            totalRefunds: { $sum: '$totalRefundAmount' },
            refundCount: { $sum: 1 }
          }
        }
      ]),
      Expense.aggregate([
        { $match: expenseMatch },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$amount' },
            expenseCount: { $sum: 1 }
          }
        }
      ])
    ]);

    const sales = salesAgg[0] || {
      grossSales: 0,
      discounts: 0,
      grandTotalRevenue: 0,
      totalCOGS: 0,
      orderCount: 0
    };
    const returns = returnsAgg[0] || { totalRefunds: 0, refundCount: 0 };
    const expenses = expensesAgg[0] || { totalExpenses: 0, expenseCount: 0 };

    // Financial formulas
    const grossSales = Number(sales.grossSales.toFixed(2));
    const totalDiscounts = Number(sales.discounts.toFixed(2));
    const totalRefunds = Number(returns.totalRefunds.toFixed(2));
    const netSales = Number((grossSales - totalDiscounts - totalRefunds).toFixed(2));
    const costOfGoodsSold = Number(sales.totalCOGS.toFixed(2));
    const grossProfit = Number((netSales - costOfGoodsSold).toFixed(2));
    const grossProfitMargin = netSales > 0 ? Number(((grossProfit / netSales) * 100).toFixed(2)) : 0;
    const operatingExpenses = Number(expenses.totalExpenses.toFixed(2));
    const netOperatingResult = Number((grossProfit - operatingExpenses).toFixed(2));
    const netProfitMargin = netSales > 0 ? Number(((netOperatingResult / netSales) * 100).toFixed(2)) : 0;

    return {
      financialFormulas: {
        formula_netSales: 'Net Sales = Gross Sales - Discounts - Refunds',
        formula_grossProfit: 'Gross Profit = Net Sales - Cost of Goods Sold (COGS)',
        formula_netOperatingResult: 'Net Operating Result = Gross Profit - Operating Expenses',
        notes: 'COGS is derived strictly from historical costPrice snapshots recorded at time of transaction.'
      },
      metrics: {
        orderCount: sales.orderCount,
        refundCount: returns.refundCount,
        grossSales,
        totalDiscounts,
        totalRefunds,
        netSales,
        costOfGoodsSold,
        grossProfit,
        grossProfitMarginPercent: grossProfitMargin,
        operatingExpenses,
        netOperatingResult,
        netProfitMarginPercent: netProfitMargin
      }
    };
  }

  /**
   * Sales breakdown report
   */
  static async getSalesReport(startDate?: string, endDate?: string) {
    const filter: Record<string, any> = { status: { $ne: 'voided' } };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [summary, paymentBreakdown] = await Promise.all([
      Sale.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$grandTotal' },
            totalTax: { $sum: '$taxTotal' },
            totalDiscount: { $sum: '$discountTotal' },
            orders: { $sum: 1 }
          }
        }
      ]),
      Sale.aggregate([
        { $match: filter },
        { $unwind: '$payments' },
        {
          $group: {
            _id: '$payments.method',
            totalAmount: { $sum: '$payments.amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    return {
      summary: summary[0] || { totalSales: 0, totalTax: 0, totalDiscount: 0, orders: 0 },
      paymentBreakdown
    };
  }

  /**
   * Cash Reconciliation Report
   */
  static async getCashReconciliationReport(startDate?: string, endDate?: string) {
    const filter: Record<string, any> = {};
    if (startDate || endDate) {
      filter.openedAt = {};
      if (startDate) filter.openedAt.$gte = new Date(startDate);
      if (endDate) filter.openedAt.$lte = new Date(endDate);
    }

    const shifts = await CashierShift.find(filter)
      .populate('cashierId', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ openedAt: -1 })
      .lean();

    const totalOpeningCash = shifts.reduce((sum, s) => sum + s.openingCash, 0);
    const totalSalesCash = shifts.reduce((sum, s) => sum + s.totalSalesCash, 0);
    const totalCountedCash = shifts.reduce((sum, s) => sum + (s.countedCash || 0), 0);
    const totalDiscrepancy = shifts.reduce((sum, s) => sum + (s.cashDiscrepancy || 0), 0);

    return {
      shiftCount: shifts.length,
      totalOpeningCash: Number(totalOpeningCash.toFixed(2)),
      totalSalesCash: Number(totalSalesCash.toFixed(2)),
      totalCountedCash: Number(totalCountedCash.toFixed(2)),
      totalDiscrepancy: Number(totalDiscrepancy.toFixed(2)),
      shifts
    };
  }
}
