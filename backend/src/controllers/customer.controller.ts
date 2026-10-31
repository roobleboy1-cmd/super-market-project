import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service';
import { Send } from '../utils/apiResponse';
import { paramStr } from '../utils/params';

export class CustomerController {
  static async getCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CustomerService.getCustomers(req.query as any);
      Send.success(res, result.customers, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await CustomerService.getCustomerById(paramStr(req.params.id));
      Send.success(res, customer);
    } catch (error) {
      next(error);
    }
  }

  static async createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await CustomerService.createCustomer(req.body, req.user?.id);
      Send.created(res, customer);
    } catch (error) {
      next(error);
    }
  }

  static async updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await CustomerService.updateCustomer(paramStr(req.params.id), req.body, req.user?.id);
      Send.success(res, customer);
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerPurchases(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const result = await CustomerService.getCustomerPurchases(paramStr(req.params.id), page, limit);
      Send.success(res, result.sales, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerLoyalty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CustomerService.getCustomerLoyaltyHistory(paramStr(req.params.id));
      Send.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async adjustLoyaltyPoints(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CustomerService.adjustLoyaltyPoints(
        paramStr(req.params.id),
        req.body.points,
        req.body.reason,
        req.user!.id
      );
      Send.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async validateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, subtotal, customerId } = req.body;
      const result = await CustomerService.validateCoupon(code, subtotal, customerId);
      Send.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}
