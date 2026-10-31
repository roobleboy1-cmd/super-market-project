import { Request, Response, NextFunction } from 'express';
import { PosService } from '../services/pos.service';
import { Send } from '../utils/apiResponse';
import { paramStr } from '../utils/params';

export class PosController {
  static async getSales(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PosService.getSales(req.query as any);
      Send.success(res, result.sales, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getSaleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sale = await PosService.getSaleById(paramStr(req.params.id));
      Send.success(res, sale);
    } catch (error) {
      next(error);
    }
  }

  static async checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PosService.checkout(req.body, req.user!.id);
      if (result.isDuplicate) {
        Send.success(res, result.sale, { isDuplicate: true });
      } else {
        Send.created(res, result.sale, { receiptNumber: result.receiptNumber });
      }
    } catch (error) {
      next(error);
    }
  }

  static async voidSale(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sale = await PosService.voidSale(paramStr(req.params.id), req.body.reason, req.user!.id);
      Send.success(res, sale);
    } catch (error) {
      next(error);
    }
  }

  static async getReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const receipt = await PosService.getReceipt(paramStr(req.params.id));
      Send.success(res, receipt);
    } catch (error) {
      next(error);
    }
  }

  static async reconcileOffline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const results = await PosService.reconcileOfflineBatch(req.body.batch, req.user!.id);
      Send.success(res, results);
    } catch (error) {
      next(error);
    }
  }
}
