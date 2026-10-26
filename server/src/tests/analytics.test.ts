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
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
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
              resolve({ status: res.statusCode || 500, body: parsed, headers: res.headers });
            } catch {
              resolve({ status: res.statusCode || 500, body: rawData, headers: res.headers });
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
  console.log(' WMS Phase 7: Analytics, Reports & Audit Trail Automated Tests       ');
  console.log('======================================================================\n');

  const app = createApp();

  // -------------------------------------------------------------------------
  // Auth Setup
  // -------------------------------------------------------------------------
  const adminLogin = await request(app, 'POST', '/api/v1/auth/login', {}, {
    email: 'admin@warehouse.local',
    password: 'Password123!'
  });
  assert(adminLogin.status === 200, 'Admin authentication succeeds');
  const adminToken = adminLogin.body.data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const managerLogin = await request(app, 'POST', '/api/v1/auth/login', {}, {
    email: 'manager@warehouse.local',
    password: 'Password123!'
  });
  assert(managerLogin.status === 200, 'Warehouse Manager authentication succeeds');
  const managerToken = managerLogin.body.data.token;
  const managerHeaders = { Authorization: `Bearer ${managerToken}` };

  const staffLogin = await request(app, 'POST', '/api/v1/auth/login', {}, {
    email: 'staff@warehouse.local',
    password: 'Password123!'
  });
  assert(staffLogin.status === 200, 'Warehouse Staff authentication succeeds');
  const staffToken = staffLogin.body.data.token;
  const staffHeaders = { Authorization: `Bearer ${staffToken}` };

  // -------------------------------------------------------------------------
  // TEST SUITE 1: Dashboard Analytics & Operational Metrics Engine
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 1: Dashboard Analytics & Operational Metrics Engine');

  const dashRes = await request(app, 'GET', '/api/v1/analytics/dashboard', staffHeaders);
  assert(dashRes.status === 200, 'GET /api/v1/analytics/dashboard returns 200 OK');
  assert(dashRes.body.success === true, 'Response envelope indicates success');

  const summary = dashRes.body.data?.summary;
  assert(summary?.totalProducts > 0, `Total products reported (${summary?.totalProducts} SKUs)`);
  assert(summary?.activeProducts <= summary?.totalProducts, 'Active products count is valid');
  assert(summary?.totalStockOnHand > 0, `Total on-hand stock reported (${summary?.totalStockOnHand} units)`);
  assert(summary?.totalStockReserved >= 0, `Total reserved stock reported (${summary?.totalStockReserved} units)`);
  assert(
    summary?.totalStockAvailable === summary?.totalStockOnHand - summary?.totalStockReserved,
    `Available ATP satisfies invariant: Available (${summary?.totalStockAvailable}) = OnHand (${summary?.totalStockOnHand}) - Reserved (${summary?.totalStockReserved})`
  );
  assert(summary?.totalInventoryValuation > 0, `Total inventory valuation calculated ($${summary?.totalInventoryValuation})`);
  assert(typeof summary?.lowStockItemCount === 'number', 'Low stock items count reported');
  assert(typeof summary?.outOfStockItemCount === 'number', 'Out of stock items count reported');
  assert(typeof summary?.pendingPurchaseOrdersCount === 'number', 'Pending purchase orders reported');
  assert(typeof summary?.pendingCustomerOrdersCount === 'number', 'Pending customer orders reported');
  assert(typeof summary?.totalShipmentsDispatched === 'number', 'Total shipments count reported');

  // Verify Charts Data
  const charts = dashRes.body.data?.charts;
  assert(Array.isArray(charts?.movementsTrend) && charts.movementsTrend.length === 7, 'Movements trend reports 7-day timeline');
  assert(Array.isArray(charts?.orderStatusDistribution), 'Order status distribution reports status categories');
  assert(Array.isArray(charts?.warehouseDistribution) && charts.warehouseDistribution.length > 0, 'Warehouse distribution reports facility metrics');
  assert(Array.isArray(charts?.topMovingProducts), 'Top moving products list is present');

  // Warehouse-Filtered Dashboard
  const whDashRes = await request(app, 'GET', '/api/v1/analytics/dashboard?warehouseId=wh-01', staffHeaders);
  assert(whDashRes.status === 200, 'Dashboard analytics filter by warehouseId succeeds (200 OK)');
  assert(whDashRes.body.data?.warehouseId === 'wh-01', 'Response confirms filtered warehouse ID');

  // -------------------------------------------------------------------------
  // TEST SUITE 2: Current Inventory & Stock Movement Reports
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 2: Current Inventory & Stock Movement Reports');

  // 1. Current Inventory Report
  const invReportRes = await request(app, 'GET', '/api/v1/reports/inventory?limit=10', staffHeaders);
  assert(invReportRes.status === 200, 'GET /api/v1/reports/inventory returns 200 OK');
  assert(invReportRes.body.reportType === 'inventory', 'Report type confirms inventory');
  assert(Array.isArray(invReportRes.body.data), 'Inventory report contains line items');
  assert(invReportRes.body.summary?.totalOnHand > 0, 'Inventory report summary calculates total on-hand quantity');
  assert(invReportRes.body.summary?.totalValuation > 0, 'Inventory report summary calculates total valuation');

  // Filter inventory by SKU
  const skuFilterRes = await request(app, 'GET', '/api/v1/reports/inventory?search=SKU-IND-001', staffHeaders);
  assert(skuFilterRes.status === 200, 'Search filter on inventory report succeeds');
  assert(skuFilterRes.body.data.every((i: any) => i.sku.includes('SKU-IND-001') || i.productName.includes('SKU-IND-001')), 'Search results match queried SKU');

  // 2. Stock Movements Report
  const movReportRes = await request(app, 'GET', '/api/v1/reports/stock-movements?limit=15', staffHeaders);
  assert(movReportRes.status === 200, 'GET /api/v1/reports/stock-movements returns 200 OK');
  assert(Array.isArray(movReportRes.body.data), 'Stock movements report returns ledger transactions');
  assert(movReportRes.body.summary?.totalQuantityMoved > 0, 'Movement summary reports total quantity moved');

  // -------------------------------------------------------------------------
  // TEST SUITE 3: Locations, Receiving, Orders & Dispatch Reports
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 3: Locations, Receiving, Orders & Dispatch Reports');

  // 3. Locations Report
  const locReportRes = await request(app, 'GET', '/api/v1/reports/locations', staffHeaders);
  assert(locReportRes.status === 200, 'GET /api/v1/reports/locations returns 200 OK');
  assert(locReportRes.body.summary?.totalLocations > 0, 'Location report summary reports total bins');
  assert(typeof locReportRes.body.summary?.occupancyRatePercent === 'number', 'Location occupancy rate percent calculated');

  // 4. Receiving (GRN) Report
  const grnReportRes = await request(app, 'GET', '/api/v1/reports/receiving', staffHeaders);
  assert(grnReportRes.status === 200, 'GET /api/v1/reports/receiving returns 200 OK');
  assert(Array.isArray(grnReportRes.body.data), 'Receiving report lists Goods Receipt Notes');
  assert(typeof grnReportRes.body.summary?.totalUnitsAccepted === 'number', 'Receiving summary aggregates accepted units');

  // 5. Customer Orders Report
  const ordersReportRes = await request(app, 'GET', '/api/v1/reports/orders', staffHeaders);
  assert(ordersReportRes.status === 200, 'GET /api/v1/reports/orders returns 200 OK');
  assert(Array.isArray(ordersReportRes.body.data), 'Orders report lists customer sales orders');
  assert(ordersReportRes.body.summary?.totalFinancialAmount >= 0, 'Orders report aggregates total financial revenue');

  // 6. Dispatch & Shipments Report
  const dspReportRes = await request(app, 'GET', '/api/v1/reports/dispatch', staffHeaders);
  assert(dspReportRes.status === 200, 'GET /api/v1/reports/dispatch returns 200 OK');
  assert(Array.isArray(dspReportRes.body.data), 'Dispatch report lists completed shipments');

  // -------------------------------------------------------------------------
  // TEST SUITE 4: Low-Stock Alerts & Valuation Reports
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 4: Low-Stock Alerts & Valuation Reports');

  // 7. Low-Stock Report
  const lowStockRes = await request(app, 'GET', '/api/v1/reports/low-stock', staffHeaders);
  assert(lowStockRes.status === 200, 'GET /api/v1/reports/low-stock returns 200 OK');
  assert(Array.isArray(lowStockRes.body.data), 'Low-stock report lists alert items');
  assert(typeof lowStockRes.body.summary?.estimatedReplenishBudget === 'number', 'Estimated replenishment budget calculated');

  // 8. Valuation Report (Admin & Manager Authorized)
  const valReportAdmin = await request(app, 'GET', '/api/v1/reports/valuation', adminHeaders);
  assert(valReportAdmin.status === 200, 'Admin authorized to view valuation report (200 OK)');
  assert(valReportAdmin.body.summary?.grandValuationTotal > 0, 'Valuation report computes grand total asset value');
  assert(valReportAdmin.body.data[0]?.assetSharePercent >= 0, 'Valuation line item calculates asset share percent');

  // Invalid Report Type Handling
  const invalidReportRes = await request(app, 'GET', '/api/v1/reports/invalid-type-xyz', adminHeaders);
  assert(invalidReportRes.status === 400, 'Invalid report type rejected with 400 Bad Request');
  assert(invalidReportRes.body.error?.code === 'INVALID_REPORT_TYPE', 'Error code specifies INVALID_REPORT_TYPE');

  // -------------------------------------------------------------------------
  // TEST SUITE 5: CSV Export Engine
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 5: CSV Export Engine');

  const csvRes = await request(app, 'GET', '/api/v1/reports/inventory/export', staffHeaders);
  assert(csvRes.status === 200, 'GET /api/v1/reports/inventory/export returns 200 OK');
  const contentType = csvRes.headers['content-type'] || '';
  assert(contentType.includes('text/csv'), 'Response headers specify Content-Type: text/csv');
  const disposition = csvRes.headers['content-disposition'] || '';
  assert(disposition.includes('attachment') && disposition.includes('.csv'), 'Content-Disposition specifies CSV file attachment');
  const csvBody = typeof csvRes.body === 'string' ? csvRes.body : JSON.stringify(csvRes.body);
  assert(csvBody.includes('SKU') && csvBody.includes('Product Name') && csvBody.includes('On-Hand Qty'), 'CSV export contains expected column headers');

  // -------------------------------------------------------------------------
  // TEST SUITE 6: RBAC Protection on Valuation & Audit Trail
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 6: RBAC Protection on Valuation & Audit Trail');

  // Staff forbidden from viewing valuation report
  const staffValuationRes = await request(app, 'GET', '/api/v1/reports/valuation', staffHeaders);
  assert(staffValuationRes.status === 403, 'Warehouse Staff strictly forbidden (403) from viewing valuation report');

  // Staff forbidden from exporting valuation report as CSV
  const staffValCsv = await request(app, 'GET', '/api/v1/reports/valuation/export', staffHeaders);
  assert(staffValCsv.status === 403, 'Warehouse Staff forbidden (403) from exporting valuation report as CSV');

  // Staff forbidden from accessing audit logs
  const staffAuditRes = await request(app, 'GET', '/api/v1/audit-logs', staffHeaders);
  assert(staffAuditRes.status === 403, 'Warehouse Staff forbidden (403) from accessing audit logs');

  // Manager and Admin permitted to inspect audit trail
  const managerAuditRes = await request(app, 'GET', '/api/v1/audit-logs?limit=20', managerHeaders);
  assert(managerAuditRes.status === 200, 'Warehouse Manager permitted (200 OK) to inspect audit logs');

  const adminAuditRes = await request(app, 'GET', '/api/v1/audit-logs?limit=20', adminHeaders);
  assert(adminAuditRes.status === 200, 'Admin permitted (200 OK) to inspect audit logs');
  assert(Array.isArray(adminAuditRes.body.data) && adminAuditRes.body.data.length > 0, 'Audit logs return activity records');

  // -------------------------------------------------------------------------
  // TEST SUITE 7: Security & Secret Redaction in Audit Logs
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 7: Security & Secret Redaction in Audit Logs');

  const allAuditLogs = adminAuditRes.body.data;
  const rawAuditJson = JSON.stringify(allAuditLogs);

  // Check no password hashes or tokens are leaked in audit logs
  assert(!rawAuditJson.includes('Password123!'), 'Plaintext passwords NEVER appear in audit logs');
  assert(!rawAuditJson.includes('$2a$') && !rawAuditJson.includes('$2b$'), 'Bcrypt password hashes NEVER appear in audit logs');
  assert(!rawAuditJson.includes('secret') && !rawAuditJson.includes('private_key'), 'No private secrets exposed in audit logs');

  // Verify audit log item structure
  const firstAudit = allAuditLogs[0];
  assert(!!firstAudit.action, 'Audit record tracks action name');
  assert(!!firstAudit.entity, 'Audit record tracks entity type');
  assert(!!firstAudit.createdAt, 'Audit record tracks timestamp');

  // -------------------------------------------------------------------------
  // TEST SUITE 8: Balance & Movement Reconciliation Audit
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 8: Balance & Movement Reconciliation Audit');

  const reconRes = await request(app, 'GET', '/api/v1/analytics/reconciliation', adminHeaders);
  assert(reconRes.status === 200, 'GET /api/v1/analytics/reconciliation returns 200 OK');
  assert(typeof reconRes.body.data?.totalPhysicalOnHand === 'number', 'Reconciliation reports physical on-hand balance');
  assert(typeof reconRes.body.data?.totalLedgerSum === 'number', 'Reconciliation reports total ledger movement sum');
  assert(typeof reconRes.body.data?.isReconciled === 'boolean', 'Reconciliation audit flag verified');

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
    results.filter(r => !r.passed).forEach(r => console.error(` - ${r.name}: ${r.message}`));
    process.exit(1);
  } else {
    console.log('ALL ANALYTICS, REPORTS & AUDIT TRAIL TESTS PASSED! ✓\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
