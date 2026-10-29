import { Request, Response, NextFunction } from 'express';
import { ShiftService } from '../services/shift.service';
import { Send } from '../utils/apiResponse';
import { paramStr } from '../utils/params';

export class ShiftController {
  static async getShifts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ShiftService.getShifts(req.query as any);
      Send.success(res, result.shifts, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getShiftById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ShiftService.getShiftById(paramStr(req.params.id));
      Send.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async openShift(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shift = await ShiftService.openShift(req.user!.id, req.body.openingCash);
      Send.created(res, shift);
    } catch (error) {
      next(error);
    }
  }

  static async recordCashMovement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const movement = await ShiftService.recordCashMovement(paramStr(req.params.id), req.body, req.user!.id);
      Send.created(res, movement);
    } catch (error) {
      next(error);
    }
  }

  static async closeShift(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shift = await ShiftService.closeShift(
        paramStr(req.params.id),
        req.body.countedCash,
        req.body.notes,
        req.user!.id
      );
      Send.success(res, shift);
    } catch (error) {
      next(error);
    }
  }

  static async approveClose(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shift = await ShiftService.approveShiftClose(
        paramStr(req.params.id),
        req.user!.id,
        req.body?.notes
      );
      Send.success(res, shift);
    } catch (error) {
      next(error);
    }
  }
}
