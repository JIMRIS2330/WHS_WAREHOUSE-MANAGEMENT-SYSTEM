import { z } from 'zod';

export const AdjustmentReasonEnum = z.enum([
  'DAMAGED_GOODS',
  'EXPIRED_STOCK',
  'CYCLE_COUNT_DISCREPANCY',
  'THEFT_OR_SHRINKAGE',
  'FOUND_STOCK',
  'DATA_ENTRY_CORRECTION',
  'SCRAP'
]);

export const stockInSchema = z.object({
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  locationId: z.string().min(1, 'Target location bin is required'),
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().positive('Stock-in quantity must be strictly greater than 0'),
  batchNumber: z.string().trim().optional().nullable(),
  unitCost: z.number().min(0, 'Unit cost cannot be negative').optional(),
  referenceType: z.string().default('RECEIVING_INBOUND'),
  referenceId: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const stockOutSchema = z.object({
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  locationId: z.string().min(1, 'Source location bin is required'),
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().positive('Stock-out quantity must be strictly greater than 0'),
  referenceType: z.string().default('DISPATCH_OUTBOUND'),
  referenceId: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const stockTransferSchema = z.object({
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  sourceLocationId: z.string().min(1, 'Source location bin is required'),
  destLocationId: z.string().min(1, 'Destination location bin is required'),
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().positive('Transfer quantity must be strictly greater than 0'),
  referenceId: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
}).refine(data => data.sourceLocationId !== data.destLocationId, {
  message: 'Source and destination locations cannot be the same bin',
  path: ['destLocationId']
});

export const stockAdjustmentSchema = z.object({
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  locationId: z.string().min(1, 'Location bin is required'),
  productId: z.string().min(1, 'Product ID is required'),
  newQuantity: z.number().min(0, 'Adjusted quantity cannot be negative'),
  reasonCode: AdjustmentReasonEnum,
  notes: z.string().trim().min(3, 'Audit notes describing reason for adjustment are required')
});

export type StockInInput = z.infer<typeof stockInSchema>;
export type StockOutInput = z.infer<typeof stockOutSchema>;
export type StockTransferInput = z.infer<typeof stockTransferSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
