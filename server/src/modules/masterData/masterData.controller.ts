import { Request, Response } from 'express';
import {
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  createSupplierSchema,
  updateSupplierSchema,
  createWarehouseSchema,
  updateWarehouseSchema,
  createZoneSchema,
  createLocationSchema,
  updateLocationSchema
} from './masterData.schema.js';
import { masterDataRepository } from './masterData.repository.js';
import { authRepository } from '../auth/auth.repository.js';

// =============================================================================
// CATEGORIES CONTROLLERS
// =============================================================================
export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  const categories = await masterDataRepository.listCategories();
  res.status(200).json({ success: true, data: categories });
};

export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  const category = await masterDataRepository.findCategoryById(req.params.id);
  if (!category) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
    return;
  }
  res.status(200).json({ success: true, data: category });
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  const validation = createCategorySchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid category payload', details: validation.error.errors }
    });
    return;
  }

  try {
    const category = await masterDataRepository.createCategory(validation.data);
    await authRepository.logAudit({
      userId: req.user?.id,
      action: 'CATEGORY_CREATED',
      entity: 'Category',
      entityId: category.id,
      details: `Created category: ${category.name} (${category.code})`
    });
    res.status(201).json({ success: true, data: category, message: 'Category created successfully' });
  } catch (err: any) {
    res.status(409).json({ success: false, error: { code: 'CONFLICT', message: err.message } });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  const validation = updateCategorySchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid category payload', details: validation.error.errors }
    });
    return;
  }

  try {
    const updated = await masterDataRepository.updateCategory(req.params.id, validation.data);
    res.status(200).json({ success: true, data: updated, message: 'Category updated successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: err.message } });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    await masterDataRepository.deleteCategory(req.params.id);
    await authRepository.logAudit({
      userId: req.user?.id,
      action: 'CATEGORY_DELETED',
      entity: 'Category',
      entityId: req.params.id,
      details: `Deleted category ID ${req.params.id}`
    });
    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'DELETE_FORBIDDEN', message: err.message } });
  }
};

// =============================================================================
// PRODUCTS CONTROLLERS
// =============================================================================
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  const search = req.query.search as string | undefined;
  const categoryId = req.query.categoryId as string | undefined;
  const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const sortBy = req.query.sortBy as string | undefined;
  const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

  const result = await masterDataRepository.listProducts({
    search,
    categoryId,
    isActive,
    page,
    limit,
    sortBy,
    sortOrder
  });

  res.status(200).json({
    success: true,
    data: result.items,
    meta: {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages
    }
  });
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  const product = await masterDataRepository.findProductById(req.params.id);
  if (!product) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    return;
  }
  res.status(200).json({ success: true, data: product });
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  const validation = createProductSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid product specifications', details: validation.error.errors }
    });
    return;
  }

  try {
    const product = await masterDataRepository.createProduct(validation.data as any);
    await authRepository.logAudit({
      userId: req.user?.id,
      action: 'PRODUCT_CREATED',
      entity: 'Product',
      entityId: product.id,
      details: `Created SKU ${product.sku}: ${product.name}`
    });
    res.status(201).json({ success: true, data: product, message: 'Product created successfully' });
  } catch (err: any) {
    res.status(409).json({ success: false, error: { code: 'CONFLICT', message: err.message } });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  const validation = updateProductSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid product update payload', details: validation.error.errors }
    });
    return;
  }

  try {
    const updated = await masterDataRepository.updateProduct(req.params.id, validation.data as any);
    await authRepository.logAudit({
      userId: req.user?.id,
      action: 'PRODUCT_UPDATED',
      entity: 'Product',
      entityId: req.params.id,
      details: `Updated SKU ${updated.sku}`
    });
    res.status(200).json({ success: true, data: updated, message: 'Product updated successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: err.message } });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await masterDataRepository.deleteProduct(req.params.id);
    await authRepository.logAudit({
      userId: req.user?.id,
      action: 'PRODUCT_DEACTIVATED',
      entity: 'Product',
      entityId: req.params.id,
      details: `Product ID ${req.params.id} marked as inactive`
    });
    res.status(200).json({
      success: true,
      message: result.deactivated
        ? 'Product safely deactivated (historical records preserved)'
        : 'Product deleted successfully'
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'DELETE_FAILED', message: err.message } });
  }
};

// =============================================================================
// SUPPLIERS CONTROLLERS
// =============================================================================
export const getSuppliers = async (req: Request, res: Response): Promise<void> => {
  const search = req.query.search as string | undefined;
  const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
  const suppliers = await masterDataRepository.listSuppliers({ search, isActive });
  res.status(200).json({ success: true, data: suppliers, total: suppliers.length });
};

export const getSupplierById = async (req: Request, res: Response): Promise<void> => {
  const supplier = await masterDataRepository.findSupplierById(req.params.id);
  if (!supplier) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Supplier not found' } });
    return;
  }
  res.status(200).json({ success: true, data: supplier });
};

export const createSupplier = async (req: Request, res: Response): Promise<void> => {
  const validation = createSupplierSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid supplier registration', details: validation.error.errors }
    });
    return;
  }

  try {
    const supplier = await masterDataRepository.createSupplier(validation.data);
    await authRepository.logAudit({
      userId: req.user?.id,
      action: 'SUPPLIER_CREATED',
      entity: 'Supplier',
      entityId: supplier.id,
      details: `Registered supplier: ${supplier.name} (${supplier.code})`
    });
    res.status(201).json({ success: true, data: supplier, message: 'Supplier registered successfully' });
  } catch (err: any) {
    res.status(409).json({ success: false, error: { code: 'CONFLICT', message: err.message } });
  }
};

export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
  const validation = updateSupplierSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid supplier payload', details: validation.error.errors }
    });
    return;
  }

  try {
    const updated = await masterDataRepository.updateSupplier(req.params.id, validation.data);
    res.status(200).json({ success: true, data: updated, message: 'Supplier updated successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: err.message } });
  }
};

export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    await masterDataRepository.deleteSupplier(req.params.id);
    res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'DELETE_FAILED', message: err.message } });
  }
};

// =============================================================================
// WAREHOUSES & LOCATIONS CONTROLLERS
// =============================================================================
export const getWarehouses = async (_req: Request, res: Response): Promise<void> => {
  const warehouses = await masterDataRepository.listWarehouses();
  res.status(200).json({ success: true, data: warehouses });
};

export const getWarehouseById = async (req: Request, res: Response): Promise<void> => {
  const wh = await masterDataRepository.findWarehouseById(req.params.id);
  if (!wh) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Warehouse not found' } });
    return;
  }
  const zones = await masterDataRepository.listZones(wh.id);
  res.status(200).json({ success: true, data: { ...wh, zones } });
};

export const createWarehouse = async (req: Request, res: Response): Promise<void> => {
  const validation = createWarehouseSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid warehouse details', details: validation.error.errors }
    });
    return;
  }

  try {
    const warehouse = await masterDataRepository.createWarehouse(validation.data);
    res.status(201).json({ success: true, data: warehouse, message: 'Warehouse facility registered' });
  } catch (err: any) {
    res.status(409).json({ success: false, error: { code: 'CONFLICT', message: err.message } });
  }
};

export const updateWarehouse = async (req: Request, res: Response): Promise<void> => {
  const validation = updateWarehouseSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid warehouse update', details: validation.error.errors }
    });
    return;
  }

  try {
    const updated = await masterDataRepository.updateWarehouse(req.params.id, validation.data);
    res.status(200).json({ success: true, data: updated, message: 'Warehouse updated' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: err.message } });
  }
};

export const deleteWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    await masterDataRepository.deleteWarehouse(req.params.id);
    res.status(200).json({ success: true, message: 'Warehouse deleted' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'DELETE_FORBIDDEN', message: err.message } });
  }
};

// -----------------------------------------------------------------------------
// ZONES CONTROLLERS
// -----------------------------------------------------------------------------
export const getZonesByWarehouse = async (req: Request, res: Response): Promise<void> => {
  const zones = await masterDataRepository.listZones(req.params.warehouseId);
  res.status(200).json({ success: true, data: zones });
};

export const createZone = async (req: Request, res: Response): Promise<void> => {
  const validation = createZoneSchema.safeParse({
    ...req.body,
    warehouseId: req.params.warehouseId || req.body.warehouseId
  });
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid zone definition', details: validation.error.errors }
    });
    return;
  }

  try {
    const zone = await masterDataRepository.createZone(validation.data as any);
    res.status(201).json({ success: true, data: zone, message: 'Zone added to warehouse' });
  } catch (err: any) {
    res.status(409).json({ success: false, error: { code: 'CONFLICT', message: err.message } });
  }
};

export const deleteZone = async (req: Request, res: Response): Promise<void> => {
  try {
    await masterDataRepository.deleteZone(req.params.id);
    res.status(200).json({ success: true, message: 'Zone deleted' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'DELETE_FORBIDDEN', message: err.message } });
  }
};

// -----------------------------------------------------------------------------
// LOCATIONS (BINS) CONTROLLERS
// -----------------------------------------------------------------------------
export const getLocations = async (req: Request, res: Response): Promise<void> => {
  const warehouseId = (req.query.warehouseId as string) || req.params.warehouseId;
  if (!warehouseId) {
    res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'warehouseId query param required' } });
    return;
  }

  const zoneId = req.query.zoneId as string | undefined;
  const search = req.query.search as string | undefined;
  const isLocked = req.query.isLocked !== undefined ? req.query.isLocked === 'true' : undefined;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;

  const result = await masterDataRepository.listLocations({
    warehouseId,
    zoneId,
    search,
    isLocked,
    page,
    limit
  });

  res.status(200).json({
    success: true,
    data: result.items,
    meta: {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages
    }
  });
};

export const createLocation = async (req: Request, res: Response): Promise<void> => {
  const validation = createLocationSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid bin location', details: validation.error.errors }
    });
    return;
  }

  try {
    const loc = await masterDataRepository.createLocation(validation.data);
    res.status(201).json({ success: true, data: loc, message: 'Storage bin location generated' });
  } catch (err: any) {
    res.status(409).json({ success: false, error: { code: 'CONFLICT', message: err.message } });
  }
};

export const updateLocation = async (req: Request, res: Response): Promise<void> => {
  const validation = updateLocationSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid location update', details: validation.error.errors }
    });
    return;
  }

  try {
    const updated = await masterDataRepository.updateLocation(req.params.id, validation.data);
    res.status(200).json({ success: true, data: updated, message: 'Location updated' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: err.message } });
  }
};

export const deleteLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    await masterDataRepository.deleteLocation(req.params.id);
    res.status(200).json({ success: true, message: 'Storage bin deleted' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'DELETE_FORBIDDEN', message: err.message } });
  }
};
