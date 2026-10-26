import { Router } from 'express';
import {
  getInventory,
  getInventorySummary,
  getStockMovements,
  stockIn,
  stockOut,
  stockTransfer,
  stockAdjustment,
  getValuationReport,
  getReconciliation
} from '../modules/inventory/inventory.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// All inventory operations require authentication
router.use(authenticate);

// -----------------------------------------------------------------------------
// Read & Reporting Routes
// -----------------------------------------------------------------------------
router.get('/', getInventory);
router.get('/summary', getInventorySummary);
router.get('/movements', getStockMovements);
router.get('/valuation', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), getValuationReport);
router.get('/reconciliation', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), getReconciliation);

// -----------------------------------------------------------------------------
// Transactional Stock Execution Routes
// -----------------------------------------------------------------------------
router.post('/stock-in', authorize(['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF']), stockIn);
router.post('/stock-out', authorize(['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF']), stockOut);
router.post('/transfer', authorize(['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF']), stockTransfer);
router.post('/adjustment', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), stockAdjustment);

export default router;
