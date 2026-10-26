import { Request, Response } from 'express';
import {
  dashboardQuerySchema,
  reportQuerySchema,
  auditLogQuerySchema
} from './analytics.schema.js';
import { analyticsRepository } from './analytics.repository.js';
import { ReportType } from './analytics.types.js';

export const getDashboardAnalytics = async (req: Request, res: Response): Promise<void> => {
  const validation = dashboardQuerySchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid dashboard query parameters',
        details: validation.error.errors
      }
    });
    return;
  }

  try {
    const warehouseId = validation.data.warehouseId;
    const metrics = await analyticsRepository.getDashboardMetrics(warehouseId);
    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to compute dashboard metrics' }
    });
  }
};

export const getReport = async (req: Request, res: Response): Promise<void> => {
  const reportType = req.params.reportType as ReportType;
  const validReportTypes: ReportType[] = [
    'inventory',
    'stock-movements',
    'locations',
    'receiving',
    'orders',
    'dispatch',
    'low-stock',
    'valuation'
  ];

  if (!validReportTypes.includes(reportType)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REPORT_TYPE',
        message: `Report type '${reportType}' is invalid. Supported reports: ${validReportTypes.join(', ')}`
      }
    });
    return;
  }

  // RBAC protection: Valuation report is restricted to Admin and Manager
  if (reportType === 'valuation' && req.user?.role === 'WAREHOUSE_STAFF') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Warehouse staff are not authorized to view financial valuation reports'
      }
    });
    return;
  }

  const validation = reportQuerySchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid report filter parameters',
        details: validation.error.errors
      }
    });
    return;
  }

  try {
    const result = await analyticsRepository.getReportData(reportType, validation.data);
    res.status(200).json({
      success: true,
      data: result.items,
      summary: result.summary,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      title: result.title,
      reportType: result.reportType,
      generatedAt: result.generatedAt
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'REPORT_GENERATION_FAILED', message: err.message }
    });
  }
};

export const exportReportCsv = async (req: Request, res: Response): Promise<void> => {
  const reportType = req.params.reportType as ReportType;
  const validReportTypes: ReportType[] = [
    'inventory',
    'stock-movements',
    'locations',
    'receiving',
    'orders',
    'dispatch',
    'low-stock',
    'valuation'
  ];

  if (!validReportTypes.includes(reportType)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REPORT_TYPE',
        message: `Report type '${reportType}' is invalid. Supported reports: ${validReportTypes.join(', ')}`
      }
    });
    return;
  }

  // RBAC protection: Valuation report is restricted to Admin and Manager
  if (reportType === 'valuation' && req.user?.role === 'WAREHOUSE_STAFF') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Warehouse staff are not authorized to view financial valuation reports'
      }
    });
    return;
  }

  const validation = reportQuerySchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid report parameters for CSV export',
        details: validation.error.errors
      }
    });
    return;
  }

  try {
    const { filename, csv } = await analyticsRepository.generateCsv(reportType, validation.data);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'CSV_EXPORT_FAILED', message: err.message }
    });
  }
};

export const getAuditLogsList = async (req: Request, res: Response): Promise<void> => {
  const validation = auditLogQuerySchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid audit log query parameters',
        details: validation.error.errors
      }
    });
    return;
  }

  try {
    const result = await analyticsRepository.getAuditLogs(validation.data);
    res.status(200).json({
      success: true,
      data: result.items,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to fetch audit logs' }
    });
  }
};

export const getReconciliationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const warehouseId = req.query.warehouseId as string | undefined;
    const result = await analyticsRepository.reconcileReportTotals(warehouseId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'RECONCILIATION_FAILED', message: err.message }
    });
  }
};
