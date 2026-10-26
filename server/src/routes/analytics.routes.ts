import { Router } from 'express';
import {
  getDashboardAnalytics,
  getReport,
  exportReportCsv,
  getAuditLogsList,
  getReconciliationStatus
} from '../modules/analytics/analytics.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// All analytics and report operations require authentication
router.use(authenticate);

// -----------------------------------------------------------------------------
// Dashboard Analytics & Charts
// -----------------------------------------------------------------------------
router.get('/analytics/dashboard', getDashboardAnalytics);
router.get(
  '/analytics/reconciliation',
  authorize(['ADMIN', 'WAREHOUSE_MANAGER']),
  getReconciliationStatus
);

// -----------------------------------------------------------------------------
// Operational Reports & CSV Export
// -----------------------------------------------------------------------------
router.get('/reports/:reportType', getReport);
router.get('/reports/:reportType/export', exportReportCsv);

// -----------------------------------------------------------------------------
// Audit Logs & Security Inspection
// -----------------------------------------------------------------------------
router.get(
  '/audit-logs',
  authorize(['ADMIN', 'WAREHOUSE_MANAGER']),
  getAuditLogsList
);

export default router;
