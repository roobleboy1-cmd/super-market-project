import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service';
import { Send } from '../utils/apiResponse';

export class ReportController {
  static async getDashboardStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await ReportService.getDashboardStats();
      Send.success(res, stats);
    } catch (error) {
      next(error);
    }
  }

  static async getSalesChart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const days = req.query.days ? Number(req.query.days) : 7;
      const chart = await ReportService.getSalesChart(days);
      Send.success(res, chart);
    } catch (error) {
      next(error);
    }
  }

  static async getRecentSales(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const sales = await ReportService.getRecentSales(limit);
      Send.success(res, sales);
    } catch (error) {
      next(error);
    }
  }

  static async getTopProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 5;
      const top = await ReportService.getTopProducts(limit);
      Send.success(res, top);
    } catch (error) {
      next(error);
    }
  }

  static async getDashboardAlerts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const alerts = await ReportService.getDashboardAlerts();
      Send.success(res, alerts);
    } catch (error) {
      next(error);
    }
  }

  static async getSalesReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const report = await ReportService.getSalesReport(startDate as string, endDate as string);
      Send.success(res, report);
    } catch (error) {
      next(error);
    }
  }

  static async getProfitReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const report = await ReportService.getProfitReport(startDate as string, endDate as string);
      Send.success(res, report);
    } catch (error) {
      next(error);
    }
  }

  static async getCashReconciliationReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const report = await ReportService.getCashReconciliationReport(
        startDate as string,
        endDate as string
      );
      Send.success(res, report);
    } catch (error) {
      next(error);
    }
  }
}
