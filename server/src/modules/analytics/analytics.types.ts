/**
 * Type definitions for Dashboard Analytics, Reports Engine, and Audit Logs
 */

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

export interface ReportResult<T = any> {
  reportType: ReportType;
  title: string;
  generatedAt: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  summary: Record<string, any>;
  items: T[];
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
