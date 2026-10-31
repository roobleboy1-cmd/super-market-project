import mongoose from 'mongoose';
import { Product, IProduct } from '../models/Product';
import { Category, ICategory } from '../models/Category';
import { Brand, IBrand } from '../models/Brand';
import { Unit, IUnit } from '../models/Unit';
import { Supplier, ISupplier } from '../models/Supplier';
import { Sale } from '../models/Sale';
import { Purchase } from '../models/Purchase';
import { StoreSettings } from '../models/StoreSettings';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { parseCsvString, toCsvString } from '../utils/csv';
import { generateBarcodeLabelSvg } from '../utils/barcode';
import { AuditService } from './audit.service';

export class CatalogService {
  /* ======================== PRODUCTS ======================== */

  static async getProducts(query: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    brandId?: string;
    isArchived?: boolean;
    lowStock?: boolean;
  }) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      isArchived: query.isArchived !== undefined ? Boolean(query.isArchived) : false
    };

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { sku: { $regex: query.search, $options: 'i' } },
        { barcode: { $regex: query.search, $options: 'i' } }
      ];
    }

    if (query.categoryId) {
      filter.category = new mongoose.Types.ObjectId(query.categoryId);
    }

    if (query.brandId) {
      filter.brand = new mongoose.Types.ObjectId(query.brandId);
    }

    if (query.lowStock) {
      filter.$expr = { $lte: ['$currentStock', '$minStockLevel'] };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name code')
        .populate('brand', 'name')
        .populate('unit', 'name symbol precision')
        .populate('defaultSupplier', 'name companyName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter)
    ]);

    return {
      products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getProductById(id: string) {
    const product = await Product.findById(id)
      .populate('category', 'name code')
      .populate('brand', 'name')
      .populate('unit', 'name symbol precision')
      .populate('defaultSupplier', 'name companyName phone');

    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return product;
  }

  static async createProduct(data: Partial<IProduct>, userId?: string) {
    const existingSku = await Product.findOne({ sku: data.sku });
    if (existingSku) {
      throw new ConflictError(`Product with SKU '${data.sku}' already exists.`);
    }

    const existingBarcode = await Product.findOne({ barcode: data.barcode });
    if (existingBarcode) {
      throw new ConflictError(`Product with Barcode '${data.barcode}' already exists.`);
    }

    // Resolve category
    const catId = (data as any).category || (data as any).categoryId;
    if (catId && mongoose.Types.ObjectId.isValid(catId)) {
      data.category = new mongoose.Types.ObjectId(catId);
    } else {
      const defaultCat = await Category.findOne({ isActive: true });
      if (defaultCat) data.category = defaultCat._id as any;
    }
    delete (data as any).categoryId;

    // Resolve brand
    const brandId = (data as any).brand || (data as any).brandId;
    if (brandId && mongoose.Types.ObjectId.isValid(brandId)) {
      data.brand = new mongoose.Types.ObjectId(brandId);
    } else {
      delete (data as any).brand;
    }
    delete (data as any).brandId;

    // Resolve defaultSupplier
    const supId = (data as any).defaultSupplier || (data as any).supplierId;
    if (supId && mongoose.Types.ObjectId.isValid(supId)) {
      data.defaultSupplier = new mongoose.Types.ObjectId(supId);
    } else {
      delete (data as any).defaultSupplier;
    }
    delete (data as any).supplierId;

    // Resolve unit
    if (!data.unit || !mongoose.Types.ObjectId.isValid(data.unit as any)) {
      const unitDoc = await Unit.findOne({
        $or: [{ symbol: data.unit as any }, { name: data.unit as any }, { isActive: true }]
      });
      if (unitDoc) {
        data.unit = unitDoc._id as any;
      }
    }

    // Resolve initial stock
    if (data.currentStock === undefined && (data as any).quantity !== undefined) {
      data.currentStock = Number((data as any).quantity) || 0;
    }
    delete (data as any).quantity;

    if ((data as any).trackExpiry !== undefined && data.isExpiringProduct === undefined) {
      data.isExpiringProduct = Boolean((data as any).trackExpiry);
    }

    const product = await Product.create(data);

    if (userId) {
      await AuditService.log({
        actorId: userId,
        action: 'PRODUCT_CREATED',
        entity: 'Product',
        entityId: (product._id as any).toString(),
        changes: data
      });
    }

    return product;
  }

  static async updateProduct(id: string, data: Partial<IProduct>, userId?: string) {
    if (data.sku) {
      const existingSku = await Product.findOne({ sku: data.sku, _id: { $ne: id } });
      if (existingSku) {
        throw new ConflictError(`Another product with SKU '${data.sku}' already exists.`);
      }
    }

    if (data.barcode) {
      const existingBarcode = await Product.findOne({ barcode: data.barcode, _id: { $ne: id } });
      if (existingBarcode) {
        throw new ConflictError(`Another product with Barcode '${data.barcode}' already exists.`);
      }
    }

    // Resolve references if provided
    const catId = (data as any).category || (data as any).categoryId;
    if (catId) {
      if (mongoose.Types.ObjectId.isValid(catId)) {
        data.category = new mongoose.Types.ObjectId(catId);
      }
      delete (data as any).categoryId;
    }

    const brandId = (data as any).brand || (data as any).brandId;
    if (brandId !== undefined) {
      if (brandId && mongoose.Types.ObjectId.isValid(brandId)) {
        data.brand = new mongoose.Types.ObjectId(brandId);
      } else {
        delete (data as any).brand;
      }
      delete (data as any).brandId;
    }

    const supId = (data as any).defaultSupplier || (data as any).supplierId;
    if (supId !== undefined) {
      if (supId && mongoose.Types.ObjectId.isValid(supId)) {
        data.defaultSupplier = new mongoose.Types.ObjectId(supId);
      } else {
        delete (data as any).defaultSupplier;
      }
      delete (data as any).supplierId;
    }

    if (data.unit && !mongoose.Types.ObjectId.isValid(data.unit as any)) {
      const unitDoc = await Unit.findOne({
        $or: [{ symbol: data.unit as any }, { name: data.unit as any }]
      });
      if (unitDoc) {
        data.unit = unitDoc._id as any;
      } else {
        delete (data as any).unit;
      }
    }

    if (data.currentStock === undefined && (data as any).quantity !== undefined) {
      data.currentStock = Number((data as any).quantity) || 0;
    }
    delete (data as any).quantity;

    if ((data as any).trackExpiry !== undefined && data.isExpiringProduct === undefined) {
      data.isExpiringProduct = Boolean((data as any).trackExpiry);
    }

    const product = await Product.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
      .populate('category', 'name code')
      .populate('brand', 'name')
      .populate('unit', 'name symbol precision')
      .populate('defaultSupplier', 'name companyName phone');
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (userId) {
      await AuditService.log({
        actorId: userId,
        action: 'PRODUCT_UPDATED',
        entity: 'Product',
        entityId: id,
        changes: data
      });
    }

    return product;
  }

  static async deleteProduct(id: string, userId?: string) {
    const product = await Product.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Safe retention rule: check if referenced in historical sales or purchases
    const [salesCount, purchasesCount] = await Promise.all([
      Sale.countDocuments({ 'items.productId': id }),
      Purchase.countDocuments({ 'items.productId': id })
    ]);

    if (salesCount > 0 || purchasesCount > 0) {
      // Archive instead of permanent deletion to preserve financial audit trail
      product.isArchived = true;
      product.archivedAt = new Date();
      product.archivedBy = userId ? new mongoose.Types.ObjectId(userId) : undefined;
      await product.save();

      if (userId) {
        await AuditService.log({
          actorId: userId,
          action: 'PRODUCT_ARCHIVED_SAFE_RETENTION',
          entity: 'Product',
          entityId: id,
          changes: { reason: 'Product referenced in sales or purchases. Archived to protect ledger integrity.' }
        });
      }

      return {
        message: 'Product is referenced by sales or purchase orders. Safely archived to preserve financial ledger.',
        isArchived: true
      };
    }

    await Product.findByIdAndDelete(id);

    if (userId) {
      await AuditService.log({
        actorId: userId,
        action: 'PRODUCT_DELETED',
        entity: 'Product',
        entityId: id
      });
    }

    return { message: 'Product permanently deleted.', isArchived: false };
  }

  static async getBarcodeLabel(id: string) {
    const product = await Product.findById(id).populate('category', 'name');
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const settings = await StoreSettings.findOne();
    const currency = settings?.currency || 'USD';

    const svg = generateBarcodeLabelSvg({
      productName: product.name,
      sku: product.sku,
      barcode: product.barcode,
      price: product.sellingPrice,
      currency,
      categoryName: (product.category as any)?.name
    });

    return {
      productId: product._id,
      sku: product.sku,
      barcode: product.barcode,
      svgLabel: svg
    };
  }

  static async importProductsCsv(csvString: string, userId?: string) {
    const rows = parseCsvString(csvString);
    if (rows.length === 0) {
      throw new ValidationError('CSV content is empty or contains no data rows.');
    }

    const errors: Array<{ row: number; sku?: string; error: string }> = [];
    let importedCount = 0;

    // Cache categories, units, and suppliers by name/symbol
    const [categories, units] = await Promise.all([
      Category.find().lean(),
      Unit.find().lean()
    ]);

    const defaultCat = categories[0]?._id;
    const defaultUnit = units[0]?._id;

    if (!defaultCat || !defaultUnit) {
      throw new ValidationError('Please initialize categories and units before importing products.');
    }

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // Row number in file
      const row = rows[i];

      const name = row.name || row.Name;
      const sku = (row.sku || row.SKU || '').trim().toUpperCase();
      const barcode = (row.barcode || row.Barcode || '').trim();
      const costPrice = parseFloat(row.costPrice || row.CostPrice || '0');
      const sellingPrice = parseFloat(row.sellingPrice || row.SellingPrice || '0');
      const taxRate = parseFloat(row.taxRate || row.TaxRate || '5');

      if (!name || !sku || !barcode) {
        errors.push({ row: rowNum, sku, error: 'Missing required field: name, sku, or barcode' });
        continue;
      }

      if (isNaN(costPrice) || isNaN(sellingPrice) || sellingPrice < 0 || costPrice < 0) {
        errors.push({ row: rowNum, sku, error: 'Invalid numeric value for costPrice or sellingPrice' });
        continue;
      }

      const existing = await Product.findOne({ $or: [{ sku }, { barcode }] });
      if (existing) {
        errors.push({ row: rowNum, sku, error: `SKU '${sku}' or Barcode '${barcode}' already exists in catalog.` });
        continue;
      }

      try {
        await Product.create({
          name,
          sku,
          barcode,
          costPrice,
          sellingPrice,
          taxRate,
          category: defaultCat,
          unit: defaultUnit,
          currentStock: 0,
          minStockLevel: 5,
          maxStockLevel: 1000,
          isExpiringProduct: false,
          isArchived: false
        });
        importedCount++;
      } catch (err: any) {
        errors.push({ row: rowNum, sku, error: err.message });
      }
    }

    if (userId) {
      await AuditService.log({
        actorId: userId,
        action: 'PRODUCTS_IMPORTED_CSV',
        entity: 'Product',
        changes: { totalRows: rows.length, importedCount, failedCount: errors.length }
      });
    }

    return {
      totalRows: rows.length,
      importedCount,
      failedCount: errors.length,
      errors
    };
  }

  static async exportProductsCsv() {
    const products = await Product.find({ isArchived: false })
      .populate('category', 'name code')
      .populate('unit', 'symbol')
      .lean();

    const rows = products.map((p) => ({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      category: (p.category as any)?.name || '',
      unit: (p.unit as any)?.symbol || 'pcs',
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      taxRate: p.taxRate,
      currentStock: p.currentStock,
      minStockLevel: p.minStockLevel
    }));

    return toCsvString(rows);
  }

  /* ======================== CATEGORIES ======================== */

  static async getCategories() {
    return Category.find().sort({ name: 1 });
  }

  static async createCategory(data: Partial<ICategory>, userId?: string) {
    const existing = await Category.findOne({ $or: [{ name: data.name }, { code: data.code }] });
    if (existing) {
      throw new ConflictError('Category name or code already exists.');
    }
    const category = await Category.create(data);
    if (userId) {
      await AuditService.log({
        actorId: userId,
        action: 'CATEGORY_CREATED',
        entity: 'Category',
        entityId: (category._id as any).toString()
      });
    }
    return category;
  }

  static async updateCategory(id: string, data: Partial<ICategory>) {
    const cat = await Category.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!cat) throw new NotFoundError('Category not found');
    return cat;
  }

  static async deleteCategory(id: string) {
    const inUse = await Product.countDocuments({ category: id });
    if (inUse > 0) {
      throw new ConflictError(`Cannot delete category: ${inUse} product(s) are assigned to it.`);
    }
    const cat = await Category.findByIdAndDelete(id);
    if (!cat) throw new NotFoundError('Category not found');
    return { message: 'Category deleted' };
  }

  /* ======================== BRANDS ======================== */

  static async getBrands() {
    return Brand.find().sort({ name: 1 });
  }

  static async createBrand(data: Partial<IBrand>) {
    const existing = await Brand.findOne({ name: data.name });
    if (existing) throw new ConflictError('Brand name already exists');
    return Brand.create(data);
  }

  static async updateBrand(id: string, data: Partial<IBrand>) {
    const brand = await Brand.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!brand) throw new NotFoundError('Brand not found');
    return brand;
  }

  static async deleteBrand(id: string) {
    const inUse = await Product.countDocuments({ brand: id });
    if (inUse > 0) {
      throw new ConflictError(`Cannot delete brand: ${inUse} product(s) are assigned to it.`);
    }
    const brand = await Brand.findByIdAndDelete(id);
    if (!brand) throw new NotFoundError('Brand not found');
    return { message: 'Brand deleted' };
  }

  /* ======================== UNITS ======================== */

  static async getUnits() {
    return Unit.find().sort({ name: 1 });
  }

  static async createUnit(data: Partial<IUnit>) {
    const existing = await Unit.findOne({ $or: [{ name: data.name }, { symbol: data.symbol }] });
    if (existing) throw new ConflictError('Unit name or symbol already exists');
    return Unit.create(data);
  }

  static async updateUnit(id: string, data: Partial<IUnit>) {
    const unit = await Unit.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!unit) throw new NotFoundError('Unit not found');
    return unit;
  }

  static async deleteUnit(id: string) {
    const inUse = await Product.countDocuments({ unit: id });
    if (inUse > 0) {
      throw new ConflictError(`Cannot delete unit: ${inUse} product(s) are using it.`);
    }
    const unit = await Unit.findByIdAndDelete(id);
    if (!unit) throw new NotFoundError('Unit not found');
    return { message: 'Unit deleted' };
  }

  /* ======================== SUPPLIERS ======================== */

  static async getSuppliers(query: { search?: string; isActive?: boolean }) {
    const filter: Record<string, any> = {};
    if (query.isActive !== undefined) filter.isActive = Boolean(query.isActive);
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { companyName: { $regex: query.search, $options: 'i' } },
        { phone: { $regex: query.search, $options: 'i' } }
      ];
    }
    return Supplier.find(filter).sort({ companyName: 1 });
  }

  static async createSupplier(data: Partial<ISupplier>, userId?: string) {
    const supplier = await Supplier.create(data);
    if (userId) {
      await AuditService.log({
        actorId: userId,
        action: 'SUPPLIER_CREATED',
        entity: 'Supplier',
        entityId: (supplier._id as any).toString(),
        changes: data
      });
    }
    return supplier;
  }

  static async updateSupplier(id: string, data: Partial<ISupplier>) {
    const supplier = await Supplier.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!supplier) throw new NotFoundError('Supplier not found');
    return supplier;
  }

  static async deleteSupplier(id: string) {
    const inUse = await Purchase.countDocuments({ supplierId: id });
    if (inUse > 0) {
      throw new ConflictError(`Cannot delete supplier: ${inUse} purchase order(s) reference it.`);
    }
    const supplier = await Supplier.findByIdAndDelete(id);
    if (!supplier) throw new NotFoundError('Supplier not found');
    return { message: 'Supplier deleted' };
  }
}
