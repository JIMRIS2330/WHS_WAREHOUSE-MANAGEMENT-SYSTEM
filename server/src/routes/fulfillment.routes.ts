import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  getOrders,
  getOrderById,
  createOrder,
  confirmAndAllocateOrder,
  cancelOrder,
  getPickTasks,
  confirmPickTask,
  confirmPacking,
  confirmDispatch,
  getShipments
} from '../modules/fulfillment/fulfillment.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// All fulfillment operations require authentication
router.use(authenticate);

// -----------------------------------------------------------------------------
// Customers Routes
// -----------------------------------------------------------------------------
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomerById);
router.post('/customers', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), createCustomer);
router.put('/customers/:id', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), updateCustomer);

// -----------------------------------------------------------------------------
// Customer Orders Routes
// -----------------------------------------------------------------------------
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);
router.post('/orders', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), createOrder);
router.post('/orders/:id/confirm', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), confirmAndAllocateOrder);
router.post('/orders/:id/cancel', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), cancelOrder);

// -----------------------------------------------------------------------------
// Picking Workstation Routes
// -----------------------------------------------------------------------------
router.get('/pick-tasks', getPickTasks);
router.post(
  '/pick-tasks/:id/confirm',
  authorize(['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF']),
  confirmPickTask
);

// -----------------------------------------------------------------------------
// Packing Workstation Routes
// -----------------------------------------------------------------------------
router.post(
  '/orders/:id/pack',
  authorize(['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF']),
  confirmPacking
);

// -----------------------------------------------------------------------------
// Dispatch & Shipping Routes
// -----------------------------------------------------------------------------
router.post(
  '/orders/:id/dispatch',
  authorize(['ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF']),
  confirmDispatch
);
router.get('/shipments', getShipments);

export default router;
