/**
 * API Client for Dashboard Analytics, Operational Reports, and Audit Trail
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

export interface DashboardMetrics {
  timestamp: string;
  warehouseId?: string;
  warehouseName?: string;
  summary: {
    totalProducts: number;
    activeProducts: number;
    totalStockOnHand: number;
    totalStockReserved: number;
    totalStockAvailable: number;
    totalInventoryValuation: number;
    lowStockItemCount: number;
    outOfStockItemCount: number;
    pendingPurchaseOrdersCount: number;
    pendingCustomerOrdersCount: number;
    totalShipmentsDispatched: number;
  };
  inboundStats: {
    totalPOs: number;
    draftPOs: number;
    submittedPOs: number;
    partiallyReceivedPOs: number;
    fullyReceivedPOs: number;
    totalReceiptsCount: number;
  };
  fulfillmentStats: {
    totalOrders: number;
    draftOrders: number;
    allocatedOrders: number;
    pickingOrders: number;
    pickedOrders: number;
    packedOrders: number;
    dispatchedOrders: number;
    cancelledOrders: number;
  };
  dispatchStats: {
    totalShipments: number;
    shipmentsToday: number;
    carrierBreakdown: Record<string, number>;
  };
  charts: {
    movementsTrend: Array<{
      date: string;
      inbound: number;
      outbound: number;
      adjustments: number;
      total: number;
    }>;
    orderStatusDistribution: Array<{
      status: string;
      count: number;
      label: string;
    }>;
    warehouseDistribution: Array<{
      warehouseId: string;
      warehouseCode: string;
      warehouseName: string;
      productCount: number;
      totalOnHand: number;
      valuation: number;
    }>;
    topMovingProducts: Array<{
      productId: string;
      sku: string;
      name: string;
      totalDispatched: number;
      unitPrice?: number;
    }>;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entity: string;
    entityId?: string | null;
    details?: string | null;
    user?: {
      id: string;
      name: string;
      email: string;
      role: string;
    } | null;
    createdAt: string;
  }>;
}

export type ReportType =
  | 'inventory'
  | 'stock-movements'
  | 'locations'
  | 'receiving'
  | 'orders'
  | 'dispatch'
  | 'low-stock'
  | 'valuation';

export interface ReportQueryParams {
  startDate?: string;
  endDate?: string;
  productId?: string;
  warehouseId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReportResponse<T = any> {
  success: boolean;
  data: T[];
  summary: Record<string, any>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  title: string;
  reportType: ReportType;
  generatedAt: string;
}

export interface AuditLogQueryParams {
  action?: string;
  entity?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogItem {
  id: string;
  userId?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// API Methods
// -----------------------------------------------------------------------------

export async function getDashboardMetrics(warehouseId?: string): Promise<{
  success: boolean;
  data: DashboardMetrics;
}> {
  const query = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : '';
  return apiRequest(`/api/v1/analytics/dashboard${query}`);
}

export async function getReport<T = any>(
  reportType: ReportType,
  params?: ReportQueryParams
): Promise<ReportResponse<T>> {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.productId) query.set('productId', params.productId);
  if (params?.warehouseId) query.set('warehouseId', params.warehouseId);
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiRequest(`/api/v1/reports/${reportType}${qs}`);
}

export function getReportExportUrl(reportType: ReportType, params?: ReportQueryParams): string {
  const query = new URLSearchParams();
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.productId) query.set('productId', params.productId);
  if (params?.warehouseId) query.set('warehouseId', params.warehouseId);
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return `/api/v1/reports/${reportType}/export${qs}`;
}

export async function downloadReportCsv(reportType: ReportType, params?: ReportQueryParams): Promise<void> {
  const url = getReportExportUrl(reportType, params);
  const token = localStorage.getItem('wms_auth_token') || 'demo_admin_token';

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Export failed with HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `wms-${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

export async function getAuditLogs(params?: AuditLogQueryParams): Promise<{
  success: boolean;
  data: AuditLogItem[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const query = new URLSearchParams();
  if (params?.action) query.set('action', params.action);
  if (params?.entity) query.set('entity', params.entity);
  if (params?.userId) query.set('userId', params.userId);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiRequest(`/api/v1/audit-logs${qs}`);
}

export async function getReconciliation(warehouseId?: string): Promise<{
  success: boolean;
  data: {
    warehouseId: string;
    productId: string;
    totalPhysicalOnHand: number;
    totalLedgerSum: number;
    isReconciled: boolean;
    discrepancy: number;
  };
}> {
  const query = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : '';
  return apiRequest(`/api/v1/analytics/reconciliation${query}`);
}
