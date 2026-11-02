import { Request, Response, NextFunction } from 'express';
import { PurchaseService } from '../services/purchase.service';
import { Send } from '../utils/apiResponse';
import { paramStr } from '../utils/params';

export class PurchaseController {
  static async getPurchases(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PurchaseService.getPurchases(req.query as any);
      Send.success(res, result.purchases, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getPurchaseById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const purchase = await PurchaseService.getPurchaseById(paramStr(req.params.id));
      Send.success(res, purchase);
    } catch (error) {
      next(error);
    }
  }

  static async createPurchase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const purchase = await PurchaseService.createPurchase(req.body, req.user!.id);
      Send.created(res, purchase);
    } catch (error) {
      next(error);
    }
  }

  static async approvePurchase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const purchase = await PurchaseService.approvePurchase(paramStr(req.params.id), req.user!.id);
      Send.success(res, purchase);
    } catch (error) {
      next(error);
    }
  }

  static async receiveGoods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawList = req.body.receivedItems || req.body.receivedQuantities || [];
      const items = rawList.map((i: any) => ({
        productId: i.productId,
        receivedQuantity: Number(i.receivedQuantity ?? i.quantityReceivedNow ?? 0),
        batchNumber: i.batchNumber,
        expirationDate: i.expirationDate,
      }));

      const purchase = await PurchaseService.receiveGoods(
        paramStr(req.params.id),
        items,
        req.user!.id
      );
      Send.success(res, purchase);
    } catch (error) {
      next(error);
    }
  }

  static async cancelPurchase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const purchase = await PurchaseService.cancelPurchase(
        paramStr(req.params.id),
        req.body.reason,
        req.user!.id
      );
      Send.success(res, purchase);
    } catch (error) {
      next(error);
    }
  }
}
