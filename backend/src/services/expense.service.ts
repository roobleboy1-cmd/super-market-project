import mongoose from 'mongoose';
import { Expense, IExpense } from '../models/Expense';
import { Payment } from '../models/Payment';
import { generateReceiptNumber } from '../utils/crypto';
import { NotFoundError } from '../utils/errors';
import { AuditService } from './audit.service';

export class ExpenseService {
  static async getExpenses(query: {
    category?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.category) filter.category = query.category;

    if (query.startDate || query.endDate) {
      filter.paidDate = {};
      if (query.startDate) filter.paidDate.$gte = new Date(query.startDate);
      if (query.endDate) filter.paidDate.$lte = new Date(query.endDate);
    }

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .populate('recordedBy', 'name email role')
        .populate('approvedBy', 'name email')
        .sort({ paidDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Expense.countDocuments(filter)
    ]);

    return {
      expenses,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static async getExpenseById(id: string) {
    const expense = await Expense.findById(id)
      .populate('recordedBy', 'name email')
      .populate('approvedBy', 'name email');
    if (!expense) throw new NotFoundError('Expense not found');
    return expense;
  }

  static async createExpense(data: Partial<IExpense>, userId: string) {
    const expenseNumber = generateReceiptNumber('EXP');
    const expense = await Expense.create({
      ...data,
      expenseNumber,
      recordedBy: new mongoose.Types.ObjectId(userId)
    });

    // Create Payment record for financial tracking
    await Payment.create({
      paymentNumber: generateReceiptNumber('PAY-EXP'),
      transactionType: 'EXPENSE',
      referenceId: expense._id,
      amount: expense.amount,
      method: expense.paymentMethod,
      status: 'completed',
      processedBy: new mongoose.Types.ObjectId(userId),
      notes: `Expense payment: ${expense.category} - ${expense.description}`
    });

    await AuditService.log({
      actorId: userId,
      action: 'EXPENSE_RECORDED',
      entity: 'Expense',
      entityId: (expense._id as any).toString(),
      changes: { expenseNumber, category: expense.category, amount: expense.amount }
    });

    return expense;
  }

  static async updateExpense(id: string, data: Partial<IExpense>, userId: string) {
    const expense = await Expense.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!expense) throw new NotFoundError('Expense not found');

    await AuditService.log({
      actorId: userId,
      action: 'EXPENSE_UPDATED',
      entity: 'Expense',
      entityId: id,
      changes: data
    });

    return expense;
  }

  static async deleteExpense(id: string, userId: string) {
    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) throw new NotFoundError('Expense not found');

    await AuditService.log({
      actorId: userId,
      action: 'EXPENSE_DELETED',
      entity: 'Expense',
      entityId: id
    });

    return { message: 'Expense deleted successfully' };
  }
}
