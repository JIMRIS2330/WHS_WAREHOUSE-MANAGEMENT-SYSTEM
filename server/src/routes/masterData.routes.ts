import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getZonesByWarehouse,
  createZone,
  deleteZone,
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation
} from '../modules/masterData/masterData.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// All master data routes require authentication
router.use(authenticate);

// -----------------------------------------------------------------------------
// Categories Routes
// -----------------------------------------------------------------------------
router.get('/categories', getCategories);
router.get('/categories/:id', getCategoryById);
router.post('/categories', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), createCategory);
router.put('/categories/:id', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), updateCategory);
router.delete('/categories/:id', authorize(['ADMIN']), deleteCategory);

// -----------------------------------------------------------------------------
// Products Routes
// -----------------------------------------------------------------------------
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.post('/products', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), createProduct);
router.put('/products/:id', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), updateProduct);
router.delete('/products/:id', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), deleteProduct);

// -----------------------------------------------------------------------------
// Suppliers Routes
// -----------------------------------------------------------------------------
router.get('/suppliers', getSuppliers);
router.get('/suppliers/:id', getSupplierById);
router.post('/suppliers', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), createSupplier);
router.put('/suppliers/:id', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), updateSupplier);
router.delete('/suppliers/:id', authorize(['ADMIN']), deleteSupplier);

// -----------------------------------------------------------------------------
// Warehouses Routes
// -----------------------------------------------------------------------------
router.get('/warehouses', getWarehouses);
router.get('/warehouses/:id', getWarehouseById);
router.post('/warehouses', authorize(['ADMIN']), createWarehouse);
router.put('/warehouses/:id', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), updateWarehouse);
router.delete('/warehouses/:id', authorize(['ADMIN']), deleteWarehouse);

// -----------------------------------------------------------------------------
// Zones & Locations Routes
// -----------------------------------------------------------------------------
router.get('/warehouses/:warehouseId/zones', getZonesByWarehouse);
router.post('/warehouses/:warehouseId/zones', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), createZone);
router.delete('/zones/:id', authorize(['ADMIN']), deleteZone);

router.get('/locations', getLocations);
router.post('/locations', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), createLocation);
router.put('/locations/:id', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), updateLocation);
router.delete('/locations/:id', authorize(['ADMIN']), deleteLocation);

export default router;
