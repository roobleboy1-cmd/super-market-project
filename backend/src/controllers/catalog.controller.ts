import { Request, Response, NextFunction } from 'express';
import { CatalogService } from '../services/catalog.service';
import { Send } from '../utils/apiResponse';
import { paramStr } from '../utils/params';

export class CatalogController {
  /* ======================== PRODUCTS ======================== */

  static async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CatalogService.getProducts(req.query as any);
      Send.success(res, result.products, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await CatalogService.getProductById(paramStr(req.params.id));
      Send.success(res, product);
    } catch (error) {
      next(error);
    }
  }

  static async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await CatalogService.createProduct(req.body, req.user?.id);
      Send.created(res, product);
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await CatalogService.updateProduct(paramStr(req.params.id), req.body, req.user?.id);
      Send.success(res, product);
    } catch (error) {
      next(error);
    }
  }

  static async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CatalogService.deleteProduct(paramStr(req.params.id), req.user?.id);
      Send.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getBarcodeLabel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const label = await CatalogService.getBarcodeLabel(paramStr(req.params.id));
      Send.success(res, label);
    } catch (error) {
      next(error);
    }
  }

  static async importProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const csvContent = typeof req.body === 'string' ? req.body : req.body.csvData;
      const result = await CatalogService.importProductsCsv(csvContent, req.user?.id);
      Send.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async exportProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const csv = await CatalogService.exportProductsCsv();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="supermarket-products.csv"');
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }

  /* ======================== CATEGORIES ======================== */

  static async getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await CatalogService.getCategories();
      Send.success(res, categories);
    } catch (error) {
      next(error);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await CatalogService.createCategory(req.body, req.user?.id);
      Send.created(res, category);
    } catch (error) {
      next(error);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await CatalogService.updateCategory(paramStr(req.params.id), req.body);
      Send.success(res, category);
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CatalogService.deleteCategory(paramStr(req.params.id));
      Send.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /* ======================== BRANDS ======================== */

  static async getBrands(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const brands = await CatalogService.getBrands();
      Send.success(res, brands);
    } catch (error) {
      next(error);
    }
  }

  static async createBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const brand = await CatalogService.createBrand(req.body);
      Send.created(res, brand);
    } catch (error) {
      next(error);
    }
  }

  static async updateBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const brand = await CatalogService.updateBrand(paramStr(req.params.id), req.body);
      Send.success(res, brand);
    } catch (error) {
      next(error);
    }
  }

  static async deleteBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CatalogService.deleteBrand(paramStr(req.params.id));
      Send.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /* ======================== UNITS ======================== */

  static async getUnits(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const units = await CatalogService.getUnits();
      Send.success(res, units);
    } catch (error) {
      next(error);
    }
  }

  static async createUnit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const unit = await CatalogService.createUnit(req.body);
      Send.created(res, unit);
    } catch (error) {
      next(error);
    }
  }

  static async updateUnit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const unit = await CatalogService.updateUnit(paramStr(req.params.id), req.body);
      Send.success(res, unit);
    } catch (error) {
      next(error);
    }
  }

  static async deleteUnit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CatalogService.deleteUnit(paramStr(req.params.id));
      Send.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /* ======================== SUPPLIERS ======================== */

  static async getSuppliers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const suppliers = await CatalogService.getSuppliers(req.query as any);
      Send.success(res, suppliers);
    } catch (error) {
      next(error);
    }
  }

  static async createSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const supplier = await CatalogService.createSupplier(req.body, req.user?.id);
      Send.created(res, supplier);
    } catch (error) {
      next(error);
    }
  }

  static async updateSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const supplier = await CatalogService.updateSupplier(paramStr(req.params.id), req.body);
      Send.success(res, supplier);
    } catch (error) {
      next(error);
    }
  }

  static async deleteSupplier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CatalogService.deleteSupplier(paramStr(req.params.id));
      Send.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}
