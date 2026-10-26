/**
 * API Client for Purchasing & Inbound Goods Receiving (GRN)
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

export interface POLineItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  product?: {
    id: string;
    sku: string;
    name: string;
    uom: string;
    costPrice: number;
  };
  quantityOrdered: number;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  unitCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoodsReceiptItem {
  id: string;
  goodsReceiptId: string;
  poLineItemId: string;
  productId: string;
  product?: {
    sku: string;
    name: string;
    uom: string;
  };
  locationId: string;
  location?: {
    barcode: string;
    aisle: string;
    rack: string;
    shelf: string;
    bin: string;
  };
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  batchNumber?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

export interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  purchaseOrder?: {
    poNumber: string;
  };
  warehouseId: string;
  warehouse?: {
    name: string;
    code: string;
  };
  receivedByUserId?: string | null;
  carrierName?: string | null;
  trackingNumber?: string | null;
  billOfLading?: string | null;
  receivedAt: string;
  notes?: string | null;
  createdAt: string;
  items: GoodsReceiptItem[];
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier?: {
    id: string;
    code: string;
    name: string;
  };
  warehouseId: string;
  warehouse?: {
    id: string;
    code: string;
    name: string;
  };
  status: 'DRAFT' | 'SUBMITTED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CANCELLED';
  expectedDate?: string | null;
  totalAmount: number;
  notes?: string | null;
  createdByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems: POLineItem[];
  goodsReceipts?: GoodsReceipt[];
}

// -----------------------------------------------------------------------------
// Purchase Orders API
// -----------------------------------------------------------------------------
export const getPurchaseOrders = async (params: {
  status?: string;
  supplierId?: string;
  warehouseId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.supplierId) query.append('supplierId', params.supplierId);
  if (params.warehouseId) query.append('warehouseId', params.warehouseId);
  if (params.search) query.append('search', params.search);
  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));

  return apiRequest<{
    success: boolean;
    items: PurchaseOrder[];
    total: number;
    page: number;
    totalPages: number;
  }>(`/api/v1/purchase-orders?${query.toString()}`);
};

export const getPurchaseOrderById = async (id: string) => {
  return apiRequest<{ success: boolean; data: PurchaseOrder }>(`/api/v1/purchase-orders/${id}`);
};

export const createPurchaseOrder = async (data: {
  supplierId: string;
  warehouseId: string;
  expectedDate?: string | null;
  notes?: string | null;
  lineItems: Array<{
    productId: string;
    quantityOrdered: number;
    unitCost: number;
  }>;
}) => {
  return apiRequest<{
    success: boolean;
    message: string;
    data: PurchaseOrder;
  }>('/api/v1/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const updatePurchaseOrderStatus = async (
  id: string,
  status: 'SUBMITTED' | 'CANCELLED',
  notes?: string | null
) => {
  return apiRequest<{
    success: boolean;
    message: string;
    data: PurchaseOrder;
  }>(`/api/v1/purchase-orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes })
  });
};

// -----------------------------------------------------------------------------
// Goods Receipts API
// -----------------------------------------------------------------------------
export const getGoodsReceipts = async (params: {
  purchaseOrderId?: string;
  warehouseId?: string;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  if (params.purchaseOrderId) query.append('purchaseOrderId', params.purchaseOrderId);
  if (params.warehouseId) query.append('warehouseId', params.warehouseId);
  if (params.limit) query.append('limit', String(params.limit));

  return apiRequest<{
    success: boolean;
    data: GoodsReceipt[];
    count: number;
  }>(`/api/v1/goods-receipts?${query.toString()}`);
};

export const getGoodsReceiptById = async (id: string) => {
  return apiRequest<{ success: boolean; data: GoodsReceipt }>(`/api/v1/goods-receipts/${id}`);
};

export const confirmGoodsReceipt = async (data: {
  purchaseOrderId: string;
  warehouseId: string;
  carrierName?: string | null;
  trackingNumber?: string | null;
  billOfLading?: string | null;
  notes?: string | null;
  items: Array<{
    poLineItemId: string;
    productId: string;
    locationId: string;
    quantityAccepted: number;
    quantityRejected: number;
    batchNumber?: string | null;
    rejectionReason?: string | null;
  }>;
}) => {
  return apiRequest<{
    success: boolean;
    message: string;
    data: {
      receipt: GoodsReceipt;
      purchaseOrder: PurchaseOrder;
      movements: any[];
    };
  }>('/api/v1/goods-receipts/confirm', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};
