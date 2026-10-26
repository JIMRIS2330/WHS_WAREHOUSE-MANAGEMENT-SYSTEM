import { createApp } from '../app.js';
import http from 'http';

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, failureMessage: string = '') {
  if (condition) {
    results.push({ name: testName, passed: true });
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    results.push({ name: testName, passed: false, message: failureMessage });
    console.error(`  ✗ FAIL: ${testName} - ${failureMessage}`);
  }
}

async function request(
  app: any,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address() as any;
      const port = addr.port;

      const payload = body ? JSON.stringify(body) : undefined;
      const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers
      };
      if (payload) {
        reqHeaders['Content-Length'] = Buffer.byteLength(payload).toString();
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: reqHeaders
        },
        res => {
          let rawData = '';
          res.on('data', chunk => {
            rawData += chunk;
          });
          res.on('end', () => {
            server.close();
            try {
              const parsed = rawData ? JSON.parse(rawData) : null;
              resolve({ status: res.statusCode || 500, body: parsed });
            } catch {
              resolve({ status: res.statusCode || 500, body: rawData });
            }
          });
        }
      );

      req.on('error', err => {
        server.close();
        reject(err);
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  });
}

async function runTests() {
  console.log('======================================================================');
  console.log(' WMS Phase 3: Master Data & Spatial Engine Automated Test Suite       ');
  console.log('======================================================================\n');

  const app = createApp();

  // 1. Authenticate as Admin
  const loginRes = await request(app, 'POST', '/api/v1/auth/login', {}, {
    email: 'admin@warehouse.local',
    password: 'Password123!'
  });
  const token = loginRes.body.data?.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // -------------------------------------------------------------------------
  // 1. Category CRUD & Hierarchy Tests
  // -------------------------------------------------------------------------
  console.log('TEST SUITE 1: Categories CRUD & Hierarchy');
  const catCode = `CAT-${Date.now().toString().slice(-4)}`;
  const createCatRes = await request(app, 'POST', '/api/v1/categories', authHeaders, {
    code: catCode,
    name: `Fasteners & Bolts ${catCode}`,
    description: 'High tensile metric bolts, nuts and washers'
  });
  assert(createCatRes.status === 201, 'Create category succeeds (201 Created)');
  const newCatId = createCatRes.body.data?.id;

  // Duplicate Code check
  const dupCatRes = await request(app, 'POST', '/api/v1/categories', authHeaders, {
    code: catCode,
    name: `Another Name`,
    description: 'Duplicate code test'
  });
  assert(dupCatRes.status === 409, 'Duplicate category code is rejected with 409 Conflict');

  // Update Category
  const updateCatRes = await request(app, 'PUT', `/api/v1/categories/${newCatId}`, authHeaders, {
    name: `Fasteners & Industrial Hardware ${catCode}`
  });
  assert(updateCatRes.status === 200, 'Update category succeeds (200 OK)');

  // -------------------------------------------------------------------------
  // 2. Product CRUD & Validation Tests
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 2: Products CRUD & Validation');
  const sku = `SKU-${Date.now().toString().slice(-5)}`;
  const createProdRes = await request(app, 'POST', '/api/v1/products', authHeaders, {
    sku,
    name: 'Grade 8.8 Hex Head Cap Screw M12x50',
    description: 'Zinc plated steel hex cap screw',
    categoryId: newCatId,
    uom: 'BOX',
    storageClass: 'AMBIENT',
    barcode: `BAR-${Date.now().toString().slice(-6)}`,
    costPrice: 4.5,
    sellingPrice: 12.0,
    reorderPoint: 25,
    reorderQuantity: 100,
    weightKg: 1.2
  });
  assert(createProdRes.status === 201, 'Create product succeeds (201 Created)');
  const newProdId = createProdRes.body.data?.id;

  // Duplicate SKU check
  const dupSkuRes = await request(app, 'POST', '/api/v1/products', authHeaders, {
    sku,
    name: 'Duplicate SKU product',
    categoryId: newCatId
  });
  assert(dupSkuRes.status === 409, 'Duplicate product SKU is rejected with 409 Conflict');

  // Foreign Key Protection: Deleting category that has products attached
  const deleteBlockedCatRes = await request(app, 'DELETE', `/api/v1/categories/${newCatId}`, authHeaders);
  assert(
    deleteBlockedCatRes.status === 400 && deleteBlockedCatRes.body.error?.code === 'DELETE_FORBIDDEN',
    'Cannot delete category referenced by active products (Foreign Key Protection enforced)'
  );

  // Read Product by ID
  const getProdRes = await request(app, 'GET', `/api/v1/products/${newProdId}`, authHeaders);
  assert(
    getProdRes.status === 200 && getProdRes.body.data?.category?.name !== undefined,
    'Get product by ID returns product enriched with category relation'
  );

  // Search & Filter Products
  const searchProdRes = await request(app, 'GET', `/api/v1/products?search=${sku}`, authHeaders);
  assert(
    searchProdRes.status === 200 && searchProdRes.body.data.length === 1,
    'Search products by SKU returns exact matching result'
  );

  // Update Product
  const updateProdRes = await request(app, 'PUT', `/api/v1/products/${newProdId}`, authHeaders, {
    sellingPrice: 14.5,
    reorderPoint: 30
  });
  assert(
    updateProdRes.status === 200 && updateProdRes.body.data?.sellingPrice === 14.5,
    'Update product attributes succeeds'
  );

  // Safe Deactivation
  const deleteProdRes = await request(app, 'DELETE', `/api/v1/products/${newProdId}`, authHeaders);
  assert(deleteProdRes.status === 200, 'Product is safely deactivated (isActive: false)');

  // -------------------------------------------------------------------------
  // 3. Supplier CRUD Tests
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 3: Suppliers CRUD');
  const supCode = `SUP-${Date.now().toString().slice(-4)}`;
  const createSupRes = await request(app, 'POST', '/api/v1/suppliers', authHeaders, {
    code: supCode,
    name: 'Apex Fastener Distribution Co.',
    contactName: 'James Wilson',
    email: 'jwilson@apexfasteners.com',
    phone: '+1-555-8831',
    address: '77 Industrial Loop',
    city: 'Cleveland',
    country: 'USA',
    leadTimeDays: 4
  });
  assert(createSupRes.status === 201, 'Create supplier succeeds (201 Created)');
  const newSupId = createSupRes.body.data?.id;

  const dupSupRes = await request(app, 'POST', '/api/v1/suppliers', authHeaders, {
    code: supCode,
    name: 'Duplicate Supplier',
    email: 'dup@apex.com',
    phone: '12345',
    address: 'test',
    city: 'test',
    country: 'test'
  });
  assert(dupSupRes.status === 409, 'Duplicate supplier code is rejected with 409 Conflict');

  const updateSupRes = await request(app, 'PUT', `/api/v1/suppliers/${newSupId}`, authHeaders, {
    leadTimeDays: 6
  });
  assert(updateSupRes.status === 200, 'Update supplier lead time succeeds');

  const deleteSupRes = await request(app, 'DELETE', `/api/v1/suppliers/${newSupId}`, authHeaders);
  assert(deleteSupRes.status === 200, 'Delete supplier succeeds');

  // -------------------------------------------------------------------------
  // 4. Warehouses, Zones & Location Bins Hierarchy Tests
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 4: Warehouses, Zones & Location Bins Hierarchy');
  const whCode = `WH-${Date.now().toString().slice(-3)}`;
  const createWhRes = await request(app, 'POST', '/api/v1/warehouses', authHeaders, {
    code: whCode,
    name: `Midwest Logistics Hub ${whCode}`,
    address: '1000 Freight Express Way',
    city: 'Indianapolis',
    country: 'USA',
    postalCode: '46201',
    totalAreaM2: 35000.0
  });
  assert(createWhRes.status === 201, 'Create warehouse facility succeeds (201 Created)');
  const newWhId = createWhRes.body.data?.id;

  // Create Zone in Warehouse
  const createZoneRes = await request(app, 'POST', `/api/v1/warehouses/${newWhId}/zones`, authHeaders, {
    warehouseId: newWhId,
    code: 'Z-PICK-A',
    name: 'Mezzanine Fast-Pick Zone',
    type: 'PICK_FACE'
  });
  assert(createZoneRes.status === 201, 'Create zone inside warehouse facility succeeds (201 Created)');
  const newZoneId = createZoneRes.body.data?.id;

  // Duplicate Zone in same Warehouse check
  const dupZoneRes = await request(app, 'POST', `/api/v1/warehouses/${newWhId}/zones`, authHeaders, {
    warehouseId: newWhId,
    code: 'Z-PICK-A',
    name: 'Duplicate Zone Code'
  });
  assert(dupZoneRes.status === 409, 'Duplicate zone code within same warehouse is rejected with 409 Conflict');

  // Create Location Bin inside Zone
  const createLocRes = await request(app, 'POST', '/api/v1/locations', authHeaders, {
    warehouseId: newWhId,
    zoneId: newZoneId,
    aisle: 'A01',
    rack: 'R01',
    shelf: 'S01',
    bin: 'B01',
    pickSequence: 10,
    maxWeightKg: 400.0,
    maxVolumeM3: 1.5
  });
  assert(createLocRes.status === 201, 'Create location bin succeeds (201 Created)');
  assert(
    createLocRes.body.data?.barcode === `${whCode}-Z-PICK-A-A01-R01-S01-B01`,
    'Canonical hierarchical barcode is automatically generated (WH-ZONE-AISLE-RACK-SHELF-BIN)'
  );
  const newLocId = createLocRes.body.data?.id;

  // Duplicate Coordinate in same Warehouse check
  const dupLocRes = await request(app, 'POST', '/api/v1/locations', authHeaders, {
    warehouseId: newWhId,
    zoneId: newZoneId,
    aisle: 'A01',
    rack: 'R01',
    shelf: 'S01',
    bin: 'B01'
  });
  assert(dupLocRes.status === 409, 'Duplicate coordinate bin in same warehouse is rejected with 409 Conflict');

  // Foreign Key Protection: Deleting warehouse with active zones
  const deleteBlockedWhRes = await request(app, 'DELETE', `/api/v1/warehouses/${newWhId}`, authHeaders);
  assert(
    deleteBlockedWhRes.status === 400 && deleteBlockedWhRes.body.error?.code === 'DELETE_FORBIDDEN',
    'Cannot delete warehouse containing active storage zones (Foreign Key Protection enforced)'
  );

  // Lock Location Bin for cycle counting
  const lockLocRes = await request(app, 'PUT', `/api/v1/locations/${newLocId}`, authHeaders, {
    isLocked: true
  });
  assert(lockLocRes.status === 200 && lockLocRes.body.data?.isLocked === true, 'Locking location bin succeeds');

  // Clean deletion in correct leaf-to-root order
  const delLocRes = await request(app, 'DELETE', `/api/v1/locations/${newLocId}`, authHeaders);
  assert(delLocRes.status === 200, 'Delete empty storage bin succeeds');

  const delZoneRes = await request(app, 'DELETE', `/api/v1/zones/${newZoneId}`, authHeaders);
  assert(delZoneRes.status === 200, 'Delete storage zone with no remaining bins succeeds');

  const delWhRes = await request(app, 'DELETE', `/api/v1/warehouses/${newWhId}`, authHeaders);
  assert(delWhRes.status === 200, 'Delete empty warehouse facility succeeds');

  // -------------------------------------------------------------------------
  // Summary Report
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(` Phase 3 Test Summary: ${passed}/${total} Passed (${failed} Failed)`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
