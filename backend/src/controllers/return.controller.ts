import { Request, Response, NextFunction } from 'express';
import { ReturnService } from '../services/return.service';
import { Send } from '../utils/apiResponse';
import { paramStr } from '../utils/params';

export class ReturnController {
  static async getReturns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ReturnService.getReturns(req.query as any);
      Send.success(res, result.returns, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getReturnById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ret = await ReturnService.getReturnById(paramStr(req.params.id));
      Send.success(res, ret);
    } catch (error) {
      next(error);
    }
  }

  static async createSaleReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const saleReturn = await ReturnService.processSaleReturn(
        paramStr(req.params.saleId),
        req.body.items,
        req.body.refundMethod,
        req.user!.id,
        req.body.notes
      );
      Send.created(res, saleReturn);
    } catch (error) {
      next(error);
    }
  }
}
