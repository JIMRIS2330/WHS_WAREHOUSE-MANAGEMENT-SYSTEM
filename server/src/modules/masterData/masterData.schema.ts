import { z } from 'zod';

export const UnitOfMeasureEnum = z.enum([
  'EACH',
  'PIECE',
  'BOX',
  'CARTON',
  'PALLET',
  'KILOGRAM',
  'METER',
  'LITER'
]);

export const StorageClassEnum = z.enum([
  'AMBIENT',
  'COLD_STORAGE',
  'FROZEN',
  'HAZARDOUS',
  'HIGH_VALUE',
  'FRAGILE'
]);

export const ZoneTypeEnum = z.enum([
  'RECEIVING_DOCK',
  'STAGING',
  'BULK_STORAGE',
  'PICK_FACE',
  'PACKING_STATION',
  'SHIPPING_DOCK',
  'QUALITY_CONTROL',
  'QUARANTINE',
  'RETURNS'
]);

// -----------------------------------------------------------------------------
// Category Schemas
// -----------------------------------------------------------------------------
export const createCategorySchema = z.object({
  code: z.string().trim().min(2, 'Category code must be at least 2 characters').toUpperCase(),
  name: z.string().trim().min(2, 'Category name is required'),
  description: z.string().trim().optional().nullable(),
  parentId: z.string().optional().nullable()
});

export const updateCategorySchema = createCategorySchema.partial();

// -----------------------------------------------------------------------------
// Product Schemas
// -----------------------------------------------------------------------------
export const createProductSchema = z.object({
  sku: z.string().trim().min(2, 'SKU is required and must be at least 2 characters').toUpperCase(),
  name: z.string().trim().min(2, 'Product name is required'),
  description: z.string().trim().optional().nullable(),
  categoryId: z.string().min(1, 'Category is required'),
  uom: UnitOfMeasureEnum.default('EACH'),
  storageClass: StorageClassEnum.default('AMBIENT'),
  barcode: z.string().trim().optional().nullable(),
  costPrice: z.number().min(0, 'Cost price cannot be negative').default(0),
  sellingPrice: z.number().min(0, 'Selling price cannot be negative').default(0),
  reorderPoint: z.number().int().min(0, 'Reorder threshold must be non-negative').default(10),
  reorderQuantity: z.number().int().min(1, 'Reorder quantity must be at least 1').default(50),
  minStockLevel: z.number().int().min(0).default(5),
  maxStockLevel: z.number().int().min(1).default(1000),
  weightKg: z.number().min(0).optional().nullable(),
  lengthCm: z.number().min(0).optional().nullable(),
  widthCm: z.number().min(0).optional().nullable(),
  heightCm: z.number().min(0).optional().nullable(),
  isActive: z.boolean().default(true)
});

export const updateProductSchema = createProductSchema.partial();

// -----------------------------------------------------------------------------
// Supplier Schemas
// -----------------------------------------------------------------------------
export const createSupplierSchema = z.object({
  code: z.string().trim().min(2, 'Supplier code must be at least 2 characters').toUpperCase(),
  name: z.string().trim().min(2, 'Supplier company name is required'),
  contactName: z.string().trim().optional().nullable(),
  email: z.string().trim().email('Invalid email address format'),
  phone: z.string().trim().min(5, 'Valid phone number required'),
  address: z.string().trim().min(3, 'Address is required'),
  city: z.string().trim().min(2, 'City is required'),
  country: z.string().trim().min(2, 'Country is required'),
  leadTimeDays: z.number().int().min(1, 'Lead time must be at least 1 day').default(7),
  paymentTerms: z.string().trim().optional().default('Net 30'),
  isActive: z.boolean().default(true)
});

export const updateSupplierSchema = createSupplierSchema.partial();

// -----------------------------------------------------------------------------
// Warehouse Schemas
// -----------------------------------------------------------------------------
export const createWarehouseSchema = z.object({
  code: z.string().trim().min(2, 'Warehouse code must be at least 2 characters').toUpperCase(),
  name: z.string().trim().min(2, 'Warehouse name is required'),
  address: z.string().trim().min(3, 'Address is required').default('100 Industrial Parkway'),
  city: z.string().trim().min(2, 'City is required'),
  country: z.string().trim().min(2, 'Country is required'),
  postalCode: z.string().trim().default('60601'),
  totalAreaM2: z.number().min(100, 'Total area must be at least 100 m²').default(10000),
  isActive: z.boolean().default(true)
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

// -----------------------------------------------------------------------------
// Zone Schemas
// -----------------------------------------------------------------------------
export const createZoneSchema = z.object({
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  code: z.string().trim().min(2, 'Zone code is required').toUpperCase(),
  name: z.string().trim().min(2, 'Zone name is required'),
  type: ZoneTypeEnum.default('BULK_STORAGE'),
  isTemperatureControlled: z.boolean().default(false)
});

export const updateZoneSchema = createZoneSchema.partial();

// -----------------------------------------------------------------------------
// Location (Bin) Schemas
// -----------------------------------------------------------------------------
export const createLocationSchema = z.object({
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  zoneId: z.string().min(1, 'Zone ID is required'),
  aisle: z.string().trim().min(1, 'Aisle is required').toUpperCase(),
  rack: z.string().trim().min(1, 'Rack is required').toUpperCase(),
  shelf: z.string().trim().min(1, 'Shelf is required').toUpperCase(),
  bin: z.string().trim().min(1, 'Bin is required').toUpperCase(),
  barcode: z.string().trim().optional(),
  pickSequence: z.number().int().default(100),
  maxWeightKg: z.number().min(0).default(500),
  maxVolumeM3: z.number().min(0).default(2.5)
});

export const updateLocationSchema = z.object({
  pickSequence: z.number().int().optional(),
  maxWeightKg: z.number().min(0).optional(),
  maxVolumeM3: z.number().min(0).optional(),
  isLocked: z.boolean().optional(),
  isOccupied: z.boolean().optional()
});
