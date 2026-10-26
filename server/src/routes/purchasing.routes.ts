import { Router } from 'express';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  getGoodsReceipts,
  getGoodsReceiptById,
  confirmGoodsReceipt
} from '../modules/purchasing/purchasing.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// All purchasing and receiving operations require authentication
router.use(authenticate);

// -----------------------------------------------------------------------------
// Purchase Orders Endpoints
// -----------------------------------------------------------------------------
router.get('/purchase-orders', getPurchaseOrders);
router.get('/purchase-orders/:id', getPurchaseOrderById);
router.post('/purchase-orders', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), createPurchaseOrder);
router.patch('/purchase-orders/:id/status', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), updatePurchaseOrderStatus);

// -----------------------------------------------------------------------------
// Goods Receipts (Receiving) Endpoints
// -----------------------------------------------------------------------------
router.get('/goods-receipts', getGoodsReceipts);
router.get('/goods-receipts/:id', getGoodsReceiptById);
router.post(
  '/goods-receipts/confirm',
  authorize(['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF']),
  confirmGoodsReceipt
);

export default router;
