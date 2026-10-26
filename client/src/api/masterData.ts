/**
 * API Client for Master Data (Products, Categories, Suppliers, Warehouses, Locations)
 */

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const token = localStorage.getItem('wms_auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Demo fallback token for seamless testing
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
// Products API
// -----------------------------------------------------------------------------
export const getProducts = async (params: {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.categoryId) query.append('categoryId', params.categoryId);
  if (params.isActive !== undefined) query.append('isActive', String(params.isActive));
  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));
  if (params.sortBy) query.append('sortBy', params.sortBy);
  if (params.sortOrder) query.append('sortOrder', params.sortOrder);

  return apiRequest<any>(`/api/v1/products?${query.toString()}`);
};

export const createProduct = async (data: any) => {
  return apiRequest<any>('/api/v1/products', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const updateProduct = async (id: string, data: any) => {
  return apiRequest<any>(`/api/v1/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const deleteProduct = async (id: string) => {
  return apiRequest<any>(`/api/v1/products/${id}`, {
    method: 'DELETE'
  });
};

// -----------------------------------------------------------------------------
// Categories API
// -----------------------------------------------------------------------------
export const getCategories = async () => {
  return apiRequest<any>('/api/v1/categories');
};

export const createCategory = async (data: any) => {
  return apiRequest<any>('/api/v1/categories', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const updateCategory = async (id: string, data: any) => {
  return apiRequest<any>(`/api/v1/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const deleteCategory = async (id: string) => {
  return apiRequest<any>(`/api/v1/categories/${id}`, {
    method: 'DELETE'
  });
};

// -----------------------------------------------------------------------------
// Suppliers API
// -----------------------------------------------------------------------------
export const getSuppliers = async (params: { search?: string; isActive?: boolean } = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.isActive !== undefined) query.append('isActive', String(params.isActive));

  return apiRequest<any>(`/api/v1/suppliers?${query.toString()}`);
};

export const createSupplier = async (data: any) => {
  return apiRequest<any>('/api/v1/suppliers', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const updateSupplier = async (id: string, data: any) => {
  return apiRequest<any>(`/api/v1/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const deleteSupplier = async (id: string) => {
  return apiRequest<any>(`/api/v1/suppliers/${id}`, {
    method: 'DELETE'
  });
};

// -----------------------------------------------------------------------------
// Warehouses & Locations API
// -----------------------------------------------------------------------------
export const getWarehouses = async () => {
  return apiRequest<any>('/api/v1/warehouses');
};

export const getWarehouseById = async (id: string) => {
  return apiRequest<any>(`/api/v1/warehouses/${id}`);
};

export const createWarehouse = async (data: any) => {
  return apiRequest<any>('/api/v1/warehouses', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const updateWarehouse = async (id: string, data: any) => {
  return apiRequest<any>(`/api/v1/warehouses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const deleteWarehouse = async (id: string) => {
  return apiRequest<any>(`/api/v1/warehouses/${id}`, {
    method: 'DELETE'
  });
};

export const getWarehouseZones = async (warehouseId: string) => {
  return apiRequest<any>(`/api/v1/warehouses/${warehouseId}/zones`);
};

export const createWarehouseZone = async (warehouseId: string, data: any) => {
  return apiRequest<any>(`/api/v1/warehouses/${warehouseId}/zones`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const deleteZone = async (id: string) => {
  return apiRequest<any>(`/api/v1/zones/${id}`, {
    method: 'DELETE'
  });
};

export const getLocations = async (params: {
  warehouseId: string;
  zoneId?: string;
  search?: string;
  isLocked?: boolean;
  page?: number;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  query.append('warehouseId', params.warehouseId);
  if (params.zoneId) query.append('zoneId', params.zoneId);
  if (params.search) query.append('search', params.search);
  if (params.isLocked !== undefined) query.append('isLocked', String(params.isLocked));
  if (params.page) query.append('page', String(params.page));
  if (params.limit) query.append('limit', String(params.limit));

  return apiRequest<any>(`/api/v1/locations?${query.toString()}`);
};

export const createLocation = async (data: any) => {
  return apiRequest<any>('/api/v1/locations', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const updateLocation = async (id: string, data: any) => {
  return apiRequest<any>(`/api/v1/locations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
};

export const deleteLocation = async (id: string) => {
  return apiRequest<any>(`/api/v1/locations/${id}`, {
    method: 'DELETE'
  });
};
