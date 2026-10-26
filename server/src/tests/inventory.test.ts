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
  console.log(' WMS Phase 4: Core Inventory Engine Automated Test Suite              ');
  console.log('======================================================================\n');

  const app = createApp();

  // 1. Authenticate as Admin
  const adminLogin = await request(app, 'POST', '/api/v1/auth/login', {}, {
    email: 'admin@warehouse.local',
    password: 'Password123!'
  });
  const adminToken = adminLogin.body.data?.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // 2. Authenticate as Warehouse Staff
  const staffLogin = await request(app, 'POST', '/api/v1/auth/login', {}, {
    email: 'staff@warehouse.local',
    password: 'Password123!'
  });
  const staffToken = staffLogin.body.data?.token;
  const staffHeaders = { Authorization: `Bearer ${staffToken}` };

  assert(!!adminToken, 'Admin authentication succeeds');
  assert(!!staffToken, 'Warehouse Staff authentication succeeds');

  // -------------------------------------------------------------------------
  // TEST SUITE 1: Inventory Balances & Triple-State Quantity Checks
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 1: Triple-State Balances (On-Hand, Reserved, Available)');

  const listRes = await request(app, 'GET', '/api/v1/inventory', adminHeaders);
  assert(listRes.status === 200, 'GET /api/v1/inventory returns 200 OK');
  assert(Array.isArray(listRes.body.items) && listRes.body.items.length > 0, 'Inventory items list is populated');

  const firstItem = listRes.body.items[0];
  const invariantHolds = firstItem.quantityAvailable === (firstItem.quantityOnHand - firstItem.quantityReserved);
  assert(
    invariantHolds,
    `Triple-state invariant holds: Available (${firstItem.quantityAvailable}) == On-Hand (${firstItem.quantityOnHand}) - Reserved (${firstItem.quantityReserved})`
  );

  const summaryRes = await request(app, 'GET', '/api/v1/inventory/summary', adminHeaders);
  assert(summaryRes.status === 200, 'GET /api/v1/inventory/summary returns 200 OK');
  assert(summaryRes.body.data?.totalSkus >= 1, 'Summary reports active SKUs');
  assert(summaryRes.body.data?.totalOnHand >= 0, 'Summary reports non-negative total on-hand');
  assert(summaryRes.body.data?.totalAssetValue > 0, 'Summary reports positive total asset value');

  // -------------------------------------------------------------------------
  // TEST SUITE 2: Stock-In Arithmetic & Audit Ledger
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 2: Stock-In Execution & Arithmetic');

  const stockInPayload = {
    warehouseId: 'wh-01',
    locationId: 'loc-01',
    productId: 'prod-01',
    quantity: 50,
    batchNumber: 'LOT-TEST-INBOUND',
    unitCost: 45.0,
    referenceType: 'PO_RECEIPT',
    referenceId: 'PO-2026-9901',
    notes: 'Received test shipment from vendor'
  };

  const beforeStockInOnHand = firstItem.quantityOnHand;
  const stockInRes = await request(app, 'POST', '/api/v1/inventory/stock-in', staffHeaders, stockInPayload);
  assert(stockInRes.status === 201, 'Stock-In succeeds with 201 Created');
  assert(stockInRes.body.data?.item.quantityOnHand === beforeStockInOnHand + 50, 'On-Hand stock incremented by exactly 50 units');
  assert(stockInRes.body.data?.movement.movementType === 'STOCK_IN', 'Stock movement recorded with type STOCK_IN');
  assert(stockInRes.body.data?.movement.newOnHand === beforeStockInOnHand + 50, 'Movement reflects new on-hand balance');

  // Negative quantity stock-in validation
  const invalidStockIn = await request(app, 'POST', '/api/v1/inventory/stock-in', staffHeaders, {
    ...stockInPayload,
    quantity: -10
  });
  assert(invalidStockIn.status === 400, 'Stock-In with negative quantity rejected (400 Bad Request)');

  // -------------------------------------------------------------------------
  // TEST SUITE 3: Stock-Out & Negative Stock Prevention
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 3: Stock-Out & Negative Stock Prevention');

  // Attempting to dispatch 99,999 units (exceeding available stock)
  const excessiveStockOut = await request(app, 'POST', '/api/v1/inventory/stock-out', staffHeaders, {
    warehouseId: 'wh-01',
    locationId: 'loc-01',
    productId: 'prod-01',
    quantity: 99999,
    referenceType: 'SO_DISPATCH',
    referenceId: 'SO-OVER-LIMIT',
    notes: 'Attempting overdraft'
  });
  assert(excessiveStockOut.status === 422, 'Excessive stock-out rejected with 422 Unprocessable Entity (Insufficient Stock)');
  assert(excessiveStockOut.body.error?.code === 'INSUFFICIENT_STOCK', 'Error code specifies INSUFFICIENT_STOCK');

  // Valid Stock-Out
  const validStockOut = await request(app, 'POST', '/api/v1/inventory/stock-out', staffHeaders, {
    warehouseId: 'wh-01',
    locationId: 'loc-01',
    productId: 'prod-01',
    quantity: 20,
    referenceType: 'SO_DISPATCH',
    referenceId: 'SO-2026-0044',
    notes: 'Standard customer order dispatch'
  });
  assert(validStockOut.status === 200, 'Valid stock-out succeeds with 200 OK');
  assert(validStockOut.body.data?.movement.movementType === 'STOCK_OUT', 'Stock movement recorded with type STOCK_OUT');

  // -------------------------------------------------------------------------
  // TEST SUITE 4: Atomic Bin-to-Bin Stock Transfers
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 4: Atomic Bin-to-Bin Stock Transfers');

  // Same bin transfer validation
  const sameBinTransfer = await request(app, 'POST', '/api/v1/inventory/transfer', staffHeaders, {
    warehouseId: 'wh-01',
    sourceLocationId: 'loc-01',
    destLocationId: 'loc-01',
    productId: 'prod-01',
    quantity: 10,
    notes: 'Invalid same-bin move'
  });
  assert(sameBinTransfer.status === 400, 'Same bin transfer rejected (400 Bad Request)');

  // Valid bin-to-bin transfer
  const validTransfer = await request(app, 'POST', '/api/v1/inventory/transfer', staffHeaders, {
    warehouseId: 'wh-01',
    sourceLocationId: 'loc-01',
    destLocationId: 'loc-02',
    productId: 'prod-01',
    quantity: 15,
    referenceId: 'TR-INTERNAL-01',
    notes: 'Replenishing pick face bin loc-02'
  });
  assert(validTransfer.status === 200, 'Atomic bin-to-bin transfer succeeds with 200 OK');
  assert(validTransfer.body.data?.sourceItem.locationId === 'loc-01', 'Source bin updated correctly');
  assert(validTransfer.body.data?.destItem.locationId === 'loc-02', 'Destination bin updated correctly');
  assert(validTransfer.body.data?.movement.movementType === 'TRANSFER', 'Recorded TRANSFER movement');
  assert(validTransfer.body.data?.movement.quantity === 15, 'Recorded movement quantity matches 15');

  // -------------------------------------------------------------------------
  // TEST SUITE 5: Audited Reason-Coded Stock Adjustments
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 5: Reason-Coded Stock Adjustments & RBAC');

  // Staff should NOT be authorized to adjust stock (Admin/Manager only)
  const staffAdjustment = await request(app, 'POST', '/api/v1/inventory/adjustment', staffHeaders, {
    warehouseId: 'wh-01',
    locationId: 'loc-02',
    productId: 'prod-03',
    newQuantity: 50,
    reasonCode: 'CYCLE_COUNT_DISCREPANCY',
    notes: 'Unauthorized staff attempt'
  });
  assert(staffAdjustment.status === 403, 'Warehouse Staff is forbidden (403) from executing stock adjustments');

  // Adjustment missing notes should fail validation
  const missingNotesAdj = await request(app, 'POST', '/api/v1/inventory/adjustment', adminHeaders, {
    warehouseId: 'wh-01',
    locationId: 'loc-02',
    productId: 'prod-03',
    newQuantity: 50,
    reasonCode: 'CYCLE_COUNT_DISCREPANCY',
    notes: ''
  });
  assert(missingNotesAdj.status === 400, 'Stock adjustment without audit explanation notes is rejected (400 Bad Request)');

  // Valid Manager/Admin Stock Adjustment
  const validAdj = await request(app, 'POST', '/api/v1/inventory/adjustment', adminHeaders, {
    warehouseId: 'wh-01',
    locationId: 'loc-02',
    productId: 'prod-03',
    newQuantity: 90,
    reasonCode: 'FOUND_STOCK',
    notes: 'Found unrecorded box during monthly cycle count in Aisle 01'
  });
  assert(validAdj.status === 200, 'Authorized stock adjustment succeeds (200 OK)');
  assert(validAdj.body.data?.adjustment.reasonCode === 'FOUND_STOCK', 'Adjustment records verified reason code');
  assert(validAdj.body.data?.adjustment.deltaQty === 5, 'Adjustment correctly calculates deltaQty (+5)');

  // -------------------------------------------------------------------------
  // TEST SUITE 6: Stock Movement Ledger & History
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 6: Stock Movement Ledger & Historical Trail');

  const movementsRes = await request(app, 'GET', '/api/v1/inventory/movements?limit=10', staffHeaders);
  assert(movementsRes.status === 200, 'GET /api/v1/inventory/movements returns 200 OK');
  assert(Array.isArray(movementsRes.body.data) && movementsRes.body.data.length > 0, 'Movement ledger contains entries');

  const latestMovement = movementsRes.body.data[0];
  assert(
    ['STOCK_IN', 'STOCK_OUT', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT_INCREASE', 'ADJUSTMENT_DECREASE'].includes(
      latestMovement.movementType
    ),
    `Movement type is recognized: ${latestMovement.movementType}`
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 7: Inventory Valuation & Costing Method
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 7: Inventory Valuation Report');

  // Staff cannot view financial valuation
  const staffValuation = await request(app, 'GET', '/api/v1/inventory/valuation', staffHeaders);
  assert(staffValuation.status === 403, 'Warehouse Staff forbidden from viewing valuation report');

  // Admin / Manager can view valuation
  const adminValuation = await request(app, 'GET', '/api/v1/inventory/valuation', adminHeaders);
  assert(adminValuation.status === 200, 'Admin can view inventory valuation report (200 OK)');
  assert(adminValuation.body.data?.totalInventoryValue > 0, 'Calculated total inventory valuation is positive');
  assert(Array.isArray(adminValuation.body.data?.items), 'Valuation breakdown contains product items');

  // -------------------------------------------------------------------------
  // TEST SUITE 8: Stock Ledger Reconciliation
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 8: Stock Ledger Reconciliation Audit');

  const reconRes = await request(
    app,
    'GET',
    '/api/v1/inventory/reconciliation?productId=prod-01&warehouseId=wh-01',
    adminHeaders
  );
  assert(reconRes.status === 200, 'Reconciliation endpoint returns 200 OK');
  assert(typeof reconRes.body.data?.physicalOnHand === 'number', 'Physical on-hand balance is reported');
  assert(typeof reconRes.body.data?.ledgerSum === 'number', 'Ledger sum of historical movements is reported');
  assert(typeof reconRes.body.data?.reconciled === 'boolean', 'Reconciliation flag is verified');

  // -------------------------------------------------------------------------
  // Test Summary
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(' TEST SUMMARY                                                         ');
  console.log('======================================================================');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    console.error(`FAILED TESTS (${failed}):`);
    results.filter(r => !r.passed).forEach(r => console.error(`  - ${r.name}: ${r.message}`));
    process.exit(1);
  } else {
    console.log('ALL INVENTORY ENGINE TESTS PASSED SUCCESSFULLY! ✓\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
