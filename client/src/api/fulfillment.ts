/**
 * API Client for Customer Orders, Picking, Packing, and Outbound Dispatch Fulfillment
 */

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const token = localStorage.getItem('wms_auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    headers['Authorization'] = 'Bearer demo_admin_token';
  }
  return headers;
};

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string>)
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error?.message || data.message || `Request failed with status ${response.status}`;
    const err: any = new Error(errorMsg);
    err.code = data.error?.code;
    err.details = data.error?.details;
    throw err;
  }

  return data;
}

// -----------------------------------------------------------------------------
// Interfaces
// -----------------------------------------------------------------------------

export interface Customer {
  id: string;
  code: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderLineItem {
  id: string;
  orderId: string;
  productId: string;
  product?: {
    id: string;
    sku: string;
    name: string;
    uom: string;
    sellingPrice?: number;
    unitPrice?: number;
  };
  quantityOrdered: number;
  quantityReserved: number;
  quantityPicked: number;
  quantityPacked: number;
  quantityDispatched: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'ALLOCATED'
  | 'PICKING'
  | 'PICKED'
  | 'PACKED'
  | 'DISPATCHED'
  | 'CANCELLED';

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: Customer;
  warehouseId: string;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  };
  status: OrderStatus;
  orderDate: string;
  requiredDate?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingCountry?: string | null;
  totalAmount: number;
  notes?: string | null;
  createdByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems: OrderLineItem[];
  pickTasks?: PickTask[];
  shipments?: Shipment[];
}

export type PickTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'PICKED' | 'SHORT_PICKED';

export interface PickTask {
  id: string;
  orderId: string;
  orderLineItemId: string;
  productId: string;
  product?: {
    id: string;
    sku: string;
    name: string;
    uom: string;
  };
  locationId: string;
  location?: {
    id: string;
    barcode: string;
    aisle: string;
    rack: string;
    shelf: string;
    bin: string;
  };
  quantityToPick: number;
  quantityPicked: number;
  status: PickTaskStatus;
  pickSequence: number;
  pickedByUserId?: string | null;
  pickedAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface Shipment {
  id: string;
  dispatchNumber: string;
  orderId: string;
  order?: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
  };
  warehouseId: string;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  };
  carrierName: string;
  trackingNumber?: string | null;
  shippingMethod?: string | null;
  dispatchedAt: string;
  dispatchedByUserId?: string | null;
  notes?: string | null;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Input Types
// -----------------------------------------------------------------------------

export interface CreateCustomerInput {
  code: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  isActive?: boolean;
}

export interface CreateOrderInput {
  customerId: string;
  warehouseId: string;
  orderDate?: string;
  requiredDate?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingCountry?: string;
  notes?: string;
  lineItems: Array<{
    productId: string;
    quantityOrdered: number;
    unitPrice: number;
  }>;
}

export interface ConfirmDispatchInput {
  carrierName: string;
  trackingNumber?: string;
  shippingMethod?: string;
  notes?: string;
}

// -----------------------------------------------------------------------------
// Customer API Methods
// -----------------------------------------------------------------------------

export async function getCustomers(params?: { search?: string; isActive?: boolean }): Promise<{
  success: boolean;
  data: Customer[];
  count: number;
}> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res: any = await apiRequest(`/api/v1/customers${qs}`);
  return {
    success: res.success,
    data: res.data || [],
    count: res.count ?? (res.data ? res.data.length : 0)
  };
}

export async function getCustomerById(id: string): Promise<{
  success: boolean;
  data: Customer;
}> {
  return apiRequest(`/api/v1/customers/${id}`);
}

export async function createCustomer(data: CreateCustomerInput): Promise<{
  success: boolean;
  message: string;
  data: Customer;
}> {
  return apiRequest('/api/v1/customers', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateCustomer(
  id: string,
  data: Partial<CreateCustomerInput>
): Promise<{
  success: boolean;
  message: string;
  data: Customer;
}> {
  return apiRequest(`/api/v1/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// -----------------------------------------------------------------------------
// Customer Orders API Methods
// -----------------------------------------------------------------------------

export async function getOrders(params?: {
  status?: string;
  customerId?: string;
  warehouseId?: string;
  search?: string;
}): Promise<{
  success: boolean;
  data: CustomerOrder[];
  count: number;
}> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.customerId) query.set('customerId', params.customerId);
  if (params?.warehouseId) query.set('warehouseId', params.warehouseId);
  if (params?.search) query.set('search', params.search);
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res: any = await apiRequest(`/api/v1/orders${qs}`);
  return {
    success: res.success,
    data: res.data || res.items || [],
    count: res.count ?? res.total ?? 0
  };
}

export async function getOrderById(id: string): Promise<{
  success: boolean;
  data: CustomerOrder;
}> {
  return apiRequest(`/api/v1/orders/${id}`);
}

export async function createOrder(data: CreateOrderInput): Promise<{
  success: boolean;
  message: string;
  data: CustomerOrder;
}> {
  return apiRequest('/api/v1/orders', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function confirmAndAllocateOrder(id: string): Promise<{
  success: boolean;
  message: string;
  data: CustomerOrder;
}> {
  return apiRequest(`/api/v1/orders/${id}/confirm`, {
    method: 'POST'
  });
}

export async function cancelOrder(
  id: string,
  reason?: string
): Promise<{
  success: boolean;
  message: string;
  data: CustomerOrder;
}> {
  return apiRequest(`/api/v1/orders/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

// -----------------------------------------------------------------------------
// Picking Workstation API Methods
// -----------------------------------------------------------------------------

export async function getPickTasks(params?: {
  orderId?: string;
  warehouseId?: string;
  status?: string;
}): Promise<{
  success: boolean;
  data: PickTask[];
  count: number;
}> {
  const query = new URLSearchParams();
  if (params?.orderId) query.set('orderId', params.orderId);
  if (params?.warehouseId) query.set('warehouseId', params.warehouseId);
  if (params?.status) query.set('status', params.status);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiRequest(`/api/v1/pick-tasks${qs}`);
}

export async function confirmPickTask(
  id: string,
  quantityPicked: number,
  notes?: string
): Promise<{
  success: boolean;
  message: string;
  data: {
    task: PickTask;
    order: CustomerOrder;
  };
}> {
  return apiRequest(`/api/v1/pick-tasks/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ quantityPicked, notes })
  });
}

// -----------------------------------------------------------------------------
// Packing Workstation API Methods
// -----------------------------------------------------------------------------

export async function confirmPacking(
  orderId: string,
  packageNotes?: string
): Promise<{
  success: boolean;
  message: string;
  data: CustomerOrder;
}> {
  return apiRequest(`/api/v1/orders/${orderId}/pack`, {
    method: 'POST',
    body: JSON.stringify({ packageNotes })
  });
}

// -----------------------------------------------------------------------------
// Dispatch & Shipping API Methods
// -----------------------------------------------------------------------------

export async function confirmDispatch(
  orderId: string,
  data: ConfirmDispatchInput
): Promise<{
  success: boolean;
  message: string;
  data: {
    shipment: Shipment;
    order: CustomerOrder;
    movements: any[];
  };
}> {
  return apiRequest(`/api/v1/orders/${orderId}/dispatch`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function getShipments(params?: {
  orderId?: string;
  warehouseId?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  data: Shipment[];
  count: number;
}> {
  const query = new URLSearchParams();
  if (params?.orderId) query.set('orderId', params.orderId);
  if (params?.warehouseId) query.set('warehouseId', params.warehouseId);
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiRequest(`/api/v1/shipments${qs}`);
}
