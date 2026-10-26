import { z } from 'zod';

export const createCustomerSchema = z.object({
  code: z.string().trim().min(2, 'Customer code must be at least 2 characters').toUpperCase(),
  name: z.string().trim().min(2, 'Customer name is required'),
  contactName: z.string().trim().optional().nullable(),
  email: z.string().trim().email('Valid email address is required'),
  phone: z.string().trim().min(5, 'Valid phone number is required'),
  address: z.string().trim().min(3, 'Address is required'),
  city: z.string().trim().min(2, 'City is required'),
  country: z.string().trim().min(2, 'Country is required')
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const orderLineItemInputSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantityOrdered: z.number().positive('Ordered quantity must be greater than zero'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative').optional()
});

export const createCustomerOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  warehouseId: z.string().min(1, 'Fulfillment warehouse facility is required'),
  requiredDate: z.string().datetime().optional().nullable(),
  shippingAddress: z.string().trim().optional().nullable(),
  shippingCity: z.string().trim().optional().nullable(),
  shippingCountry: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  lineItems: z.array(orderLineItemInputSchema).min(1, 'At least one line item is required')
});

export const confirmPickTaskSchema = z.object({
  quantityPicked: z.number().positive('Picked quantity must be greater than zero'),
  notes: z.string().trim().optional().nullable()
});

export const confirmPackingSchema = z.object({
  packageNotes: z.string().trim().optional().nullable()
});

export const confirmDispatchSchema = z.object({
  carrierName: z.string().trim().min(2, 'Carrier name is required (e.g. FedEx, UPS, DHL)'),
  trackingNumber: z.string().trim().optional().nullable(),
  shippingMethod: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable()
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateCustomerOrderInput = z.infer<typeof createCustomerOrderSchema>;
export type ConfirmPickTaskInput = z.infer<typeof confirmPickTaskSchema>;
export type ConfirmPackingInput = z.infer<typeof confirmPackingSchema>;
export type ConfirmDispatchInput = z.infer<typeof confirmDispatchSchema>;
