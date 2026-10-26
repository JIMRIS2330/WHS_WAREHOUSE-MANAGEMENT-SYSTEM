import { z } from 'zod';

export const POStatusEnum = z.enum([
  'DRAFT',
  'SUBMITTED',
  'PARTIALLY_RECEIVED',
  'FULLY_RECEIVED',
  'CANCELLED'
]);

export const poLineItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantityOrdered: z.number().positive('Ordered quantity must be greater than zero'),
  unitCost: z.number().min(0, 'Unit cost cannot be negative')
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  warehouseId: z.string().min(1, 'Target warehouse facility is required'),
  expectedDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  lineItems: z.array(poLineItemSchema).min(1, 'At least one line item is required')
});

export const updatePurchaseOrderStatusSchema = z.object({
  status: z.enum(['SUBMITTED', 'CANCELLED'], {
    errorMap: () => ({ message: 'Status can only be updated to SUBMITTED or CANCELLED' })
  }),
  notes: z.string().optional().nullable()
});

export const goodsReceiptItemInputSchema = z.object({
  poLineItemId: z.string().min(1, 'PO line item ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  locationId: z.string().min(1, 'Storage bin location is required'),
  quantityAccepted: z.number().min(0, 'Accepted quantity cannot be negative'),
  quantityRejected: z.number().min(0, 'Rejected quantity cannot be negative').default(0),
  batchNumber: z.string().trim().optional().nullable(),
  rejectionReason: z.string().trim().optional().nullable()
}).refine(data => data.quantityAccepted + data.quantityRejected > 0, {
  message: 'Combined accepted and rejected quantity must be greater than zero',
  path: ['quantityAccepted']
}).refine(data => {
  if (data.quantityRejected > 0 && (!data.rejectionReason || data.rejectionReason.length < 3)) {
    return false;
  }
  return true;
}, {
  message: 'A rejection reason (min 3 chars) is required when rejecting goods',
  path: ['rejectionReason']
});

export const confirmGoodsReceiptSchema = z.object({
  purchaseOrderId: z.string().min(1, 'Purchase Order ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  carrierName: z.string().trim().optional().nullable(),
  trackingNumber: z.string().trim().optional().nullable(),
  billOfLading: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  items: z.array(goodsReceiptItemInputSchema).min(1, 'At least one item must be received')
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderStatusInput = z.infer<typeof updatePurchaseOrderStatusSchema>;
export type ConfirmGoodsReceiptInput = z.infer<typeof confirmGoodsReceiptSchema>;
export type GoodsReceiptItemInput = z.infer<typeof goodsReceiptItemInputSchema>;
