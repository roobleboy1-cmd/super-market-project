import { Request, Response, NextFunction } from 'express';
import { ExpenseService } from '../services/expense.service';
import { Send } from '../utils/apiResponse';
import { paramStr } from '../utils/params';

export class ExpenseController {
  static async getExpenses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ExpenseService.getExpenses(req.query as any);
      Send.success(res, result.expenses, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getExpenseById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await ExpenseService.getExpenseById(paramStr(req.params.id));
      Send.success(res, expense);
    } catch (error) {
      next(error);
    }
  }

  static async createExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await ExpenseService.createExpense(req.body, req.user!.id);
      Send.created(res, expense);
    } catch (error) {
      next(error);
    }
  }

  static async updateExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await ExpenseService.updateExpense(paramStr(req.params.id), req.body, req.user!.id);
      Send.success(res, expense);
    } catch (error) {
      next(error);
    }
  }

  static async deleteExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ExpenseService.deleteExpense(paramStr(req.params.id), req.user!.id);
      Send.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}
