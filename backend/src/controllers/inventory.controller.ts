import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventory.service';
import { Send } from '../utils/apiResponse';
import { paramStr } from '../utils/params';

export class InventoryController {
  static async getSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await InventoryService.getSummary();
      Send.success(res, summary);
    } catch (error) {
      next(error);
    }
  }

  static async getLots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await InventoryService.getLots(req.query as any);
      Send.success(res, result.lots, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getLowStock(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const products = await InventoryService.getLowStockProducts();
      Send.success(res, products);
    } catch (error) {
      next(error);
    }
  }

  static async getExpiring(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const days = req.query.days ? Number(req.query.days) : 30;
      const lots = await InventoryService.getExpiringProducts(days);
      Send.success(res, lots);
    } catch (error) {
      next(error);
    }
  }

  static async getMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await InventoryService.getStockMovements(req.query as any);
      Send.success(res, result.movements, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async adjustStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await InventoryService.adjustStock(req.body, req.user!.id);
      Send.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getCounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const result = await InventoryService.getStockCounts(page, limit);
      Send.success(res, result.counts, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getCountById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await InventoryService.getStockCountById(paramStr(req.params.id));
      Send.success(res, count);
    } catch (error) {
      next(error);
    }
  }

  static async createCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await InventoryService.createStockCount(req.body, req.user!.id);
      Send.created(res, count);
    } catch (error) {
      next(error);
    }
  }

  static async submitCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await InventoryService.submitStockCount(paramStr(req.params.id), req.user!.id);
      Send.success(res, count);
    } catch (error) {
      next(error);
    }
  }

  static async approveCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await InventoryService.approveStockCount(
        paramStr(req.params.id),
        req.user!.id,
        req.body?.notes
      );
      Send.success(res, count);
    } catch (error) {
      next(error);
    }
  }
}
