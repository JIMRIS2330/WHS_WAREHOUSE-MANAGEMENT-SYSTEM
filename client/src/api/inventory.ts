/**
 * API Client for Core Inventory Engine
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

export interface InventoryItem {
  id: string;
  warehouseId: string;
  locationId: string;
  productId: string;
  product?: {
    id: string;
    sku: string;
    name: string;
    uom: string;
    costPrice: number;
    sellingPrice: number;
    reorderPoint: number;
    category?: { name: string };
  };
  location?: {
    id: string;
    barcode: string;
    aisle: string;
    rack: string;
    shelf: string;
    bin: string;
    isLocked: boolean;
  };
  warehouse?: {
    id: string;
    code: string;
    name: string;
  };
  batchNumber?: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  isLowStock?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  product?: {
    sku: string;
    name: string;
    uom: string;
  };
  warehouseId: string;
  warehouse?: {
    name: string;
    code: string;
  };
  sourceLocationId?: string | null;
  sourceLocation?: { barcode: string };
  destLocationId?: string | null;
  destLocation?: { barcode: string };
  quantity: number;
  movementType: string;
  referenceType?: string | null;
  referenceId?: string | null;
  previousOnHand: number;
  newOnHand: number;
  unitCost: number;
  performedByUserId?: string | null;
  reasonCode?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface InventorySummary {
  totalSkus: number;
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  totalAssetValue: number;
  lowStockCount: number;
}

// -----------------------------------------------------------------------------
// Inventory API Fetchers
// -----------------------------------------------------------------------------
export const getInventory = async (params: {
  warehouseId?: string;
  locationId?: string;
  productId?: string;
  isLowStock?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  if (params.warehouseId) query.append('warehouseId', params.warehouseId);
  if (params.locationId) query.append('locationId', params.locationId);
  if (params.productId) query.append('productId', params.productId);
  if (params.isLowStock !== undefined) query.append('isLowStock', String(params.isLowStock));
  if (params.search) query.append('search', params.search);
  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));

  return apiRequest<{
    success: boolean;
    items: InventoryItem[];
    total: number;
    page: number;
    totalPages: number;
  }>(`/api/v1/inventory?${query.toString()}`);
};

export const getInventorySummary = async (warehouseId?: string) => {
  const query = warehouseId ? `?warehouseId=${warehouseId}` : '';
  return apiRequest<{ success: boolean; data: InventorySummary }>(`/api/v1/inventory/summary${query}`);
};

export const getStockMovements = async (params: {
  productId?: string;
  warehouseId?: string;
  movementType?: string;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  if (params.productId) query.append('productId', params.productId);
  if (params.warehouseId) query.append('warehouseId', params.warehouseId);
  if (params.movementType) query.append('movementType', params.movementType);
  if (params.limit) query.append('limit', String(params.limit));

  return apiRequest<{ success: boolean; data: StockMovement[]; count: number }>(
    `/api/v1/inventory/movements?${query.toString()}`
  );
};

export const stockIn = async (data: {
  warehouseId: string;
  locationId: string;
  productId: string;
  quantity: number;
  batchNumber?: string | null;
  unitCost?: number;
  referenceType?: string;
  referenceId?: string | null;
  notes?: string | null;
}) => {
  return apiRequest<{
    success: boolean;
    message: string;
    data: { item: InventoryItem; movement: StockMovement };
  }>('/api/v1/inventory/stock-in', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const stockOut = async (data: {
  warehouseId: string;
  locationId: string;
  productId: string;
  quantity: number;
  referenceType?: string;
  referenceId?: string | null;
  notes?: string | null;
}) => {
  return apiRequest<{
    success: boolean;
    message: string;
    data: { item: InventoryItem; movement: StockMovement };
  }>('/api/v1/inventory/stock-out', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const stockTransfer = async (data: {
  warehouseId: string;
  sourceLocationId: string;
  destLocationId: string;
  productId: string;
  quantity: number;
  referenceId?: string | null;
  notes?: string | null;
}) => {
  return apiRequest<{
    success: boolean;
    message: string;
    data: { sourceItem: InventoryItem; destItem: InventoryItem; movement: StockMovement };
  }>('/api/v1/inventory/transfer', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const stockAdjustment = async (data: {
  warehouseId: string;
  locationId: string;
  productId: string;
  newQuantity: number;
  reasonCode: string;
  notes: string;
}) => {
  return apiRequest<{
    success: boolean;
    message: string;
    data: { item: InventoryItem; adjustment: any; movement: StockMovement };
  }>('/api/v1/inventory/adjustment', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getValuationReport = async () => {
  return apiRequest<{
    success: boolean;
    data: {
      items: Array<{
        productId: string;
        sku: string;
        name: string;
        category: string;
        onHand: number;
        unitCost: number;
        totalValue: number;
      }>;
      totalInventoryValue: number;
    };
  }>('/api/v1/inventory/valuation');
};

export const getReconciliation = async (productId: string, warehouseId: string) => {
  return apiRequest<{
    success: boolean;
    data: {
      reconciled: boolean;
      physicalOnHand: number;
      ledgerSum: number;
      difference: number;
    };
  }>(`/api/v1/inventory/reconciliation?productId=${productId}&warehouseId=${warehouseId}`);
};
