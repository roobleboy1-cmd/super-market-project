import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service';
import { Send } from '../utils/apiResponse';

export class SettingsController {
  static async getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await SettingsService.getSettings();
      Send.success(res, settings);
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await SettingsService.updateSettings(req.body, req.user!.id);
      Send.success(res, settings);
    } catch (error) {
      next(error);
    }
  }
}
