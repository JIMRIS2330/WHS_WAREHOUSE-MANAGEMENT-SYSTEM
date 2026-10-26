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
  console.log(' WMS Phase 5: Purchasing & Goods Receiving Automated Test Suite       ');
  console.log('======================================================================\n');

  const app = createApp();

  // 1. Authenticate as Admin (Manager permissions)
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
  // TEST SUITE 1: Purchase Order Creation & Validation
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 1: Purchase Order Creation & Validation');

  // Staff cannot create Purchase Orders
  const staffPoCreate = await request(app, 'POST', '/api/v1/purchase-orders', staffHeaders, {
    supplierId: 'sup-01',
    warehouseId: 'wh-01',
    lineItems: [{ productId: 'prod-01', quantityOrdered: 50, unitCost: 45 }]
  });
  assert(staffPoCreate.status === 403, 'Warehouse Staff is forbidden (403) from creating Purchase Orders');

  // PO creation with empty line items is rejected
  const emptyLinesPo = await request(app, 'POST', '/api/v1/purchase-orders', adminHeaders, {
    supplierId: 'sup-01',
    warehouseId: 'wh-01',
    lineItems: []
  });
  assert(emptyLinesPo.status === 400, 'Purchase Order with empty line items rejected (400 Bad Request)');

  // Valid PO Creation by Admin
  const validPoPayload = {
    supplierId: 'sup-01',
    warehouseId: 'wh-01',
    notes: 'Q4 Restocking batch for brushless motors',
    lineItems: [
      { productId: 'prod-01', quantityOrdered: 80, unitCost: 45.0 }
    ]
  };
  const createPoRes = await request(app, 'POST', '/api/v1/purchase-orders', adminHeaders, validPoPayload);
  assert(createPoRes.status === 201, 'Create Purchase Order succeeds with 201 Created');
  assert(createPoRes.body.data?.status === 'DRAFT', 'Initial PO status defaults to DRAFT');
  assert(createPoRes.body.data?.totalAmount === 3600.0, 'Total amount calculated correctly ($3,600.00)');
  const poId = createPoRes.body.data?.id;
  const poNumber = createPoRes.body.data?.poNumber;
  const poLineId = createPoRes.body.data?.lineItems[0]?.id;

  // -------------------------------------------------------------------------
  // TEST SUITE 2: PO Workflow & Status Transitions
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 2: Workflow & Status Transitions');

  // Attempting to receive goods against DRAFT PO is rejected
  const draftReceive = await request(app, 'POST', '/api/v1/goods-receipts/confirm', staffHeaders, {
    purchaseOrderId: poId,
    warehouseId: 'wh-01',
    items: [
      {
        poLineItemId: poLineId,
        productId: 'prod-01',
        locationId: 'loc-01',
        quantityAccepted: 20
      }
    ]
  });
  assert(draftReceive.status === 400, 'Receiving goods against DRAFT PO is rejected (must be SUBMITTED first)');

  // Submit PO
  const submitRes = await request(app, 'PATCH', `/api/v1/purchase-orders/${poId}/status`, adminHeaders, {
    status: 'SUBMITTED',
    notes: 'Approved and issued to vendor'
  });
  assert(submitRes.status === 200, 'PO status transitioned to SUBMITTED (200 OK)');
  assert(submitRes.body.data?.status === 'SUBMITTED', 'PO status confirms SUBMITTED');

  // -------------------------------------------------------------------------
  // TEST SUITE 3: Partial Goods Receiving & Inventory Engine Integration
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 3: Partial Goods Receipt & Inventory Engine Integration');

  // Fetch initial on-hand stock for prod-01 at loc-01
  const invBeforeRes = await request(
    app,
    'GET',
    '/api/v1/inventory?productId=prod-01&locationId=loc-01',
    staffHeaders
  );
  const initialOnHand = invBeforeRes.body.items[0]?.quantityOnHand || 0;

  // Confirm partial receipt: 30 units out of 80 ordered
  const receipt1Payload = {
    purchaseOrderId: poId,
    warehouseId: 'wh-01',
    carrierName: 'FedEx Freight',
    trackingNumber: 'FX-8849102-A',
    billOfLading: 'BOL-9901',
    notes: 'First partial delivery (30 units)',
    items: [
      {
        poLineItemId: poLineId,
        productId: 'prod-01',
        locationId: 'loc-01',
        quantityAccepted: 30,
        quantityRejected: 0,
        batchNumber: 'LOT-2026-F1'
      }
    ]
  };

  const receipt1Res = await request(app, 'POST', '/api/v1/goods-receipts/confirm', staffHeaders, receipt1Payload);
  assert(receipt1Res.status === 201, 'Partial Goods Receipt confirmed with 201 Created');
  assert(receipt1Res.body.data?.purchaseOrder?.status === 'PARTIALLY_RECEIVED', 'PO status transitioned to PARTIALLY_RECEIVED');
  assert(receipt1Res.body.data?.receipt?.items[0]?.quantityAccepted === 30, 'Receipt recorded 30 accepted units');
  const grnNumber1 = receipt1Res.body.data?.receipt?.receiptNumber;
  assert(!!grnNumber1, `Generated Goods Receipt Note Number: ${grnNumber1}`);

  // Verify stock was updated in Core Inventory Engine
  const invAfter1Res = await request(
    app,
    'GET',
    '/api/v1/inventory?productId=prod-01&locationId=loc-01',
    staffHeaders
  );
  const onHandAfter1 = invAfter1Res.body.items[0]?.quantityOnHand;
  assert(onHandAfter1 === initialOnHand + 30, `On-hand stock updated from ${initialOnHand} to ${onHandAfter1} (+30 units)`);

  // Verify stock movement ledger entry
  const movementsRes = await request(
    app,
    'GET',
    `/api/v1/inventory/movements?productId=prod-01&limit=5`,
    staffHeaders
  );
  const latestMovement = movementsRes.body.data[0];
  assert(latestMovement.movementType === 'STOCK_IN', 'Stock movement recorded with type STOCK_IN');
  assert(latestMovement.referenceId === grnNumber1, 'Stock movement references exact GRN receipt number');

  // -------------------------------------------------------------------------
  // TEST SUITE 4: Quality Control - Accepted vs. Rejected Quantities
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 4: Quality Control (Accepted vs Rejected Quantities)');

  // Rejection without reason must fail
  const invalidRejection = await request(app, 'POST', '/api/v1/goods-receipts/confirm', staffHeaders, {
    purchaseOrderId: poId,
    warehouseId: 'wh-01',
    items: [
      {
        poLineItemId: poLineId,
        productId: 'prod-01',
        locationId: 'loc-01',
        quantityAccepted: 10,
        quantityRejected: 5,
        rejectionReason: '' // Empty reason
      }
    ]
  });
  assert(invalidRejection.status === 400, 'Rejected goods without explanation reason rejected (400 Bad Request)');

  // Valid QC inspection: 20 accepted + 10 rejected = 30 received (cumulative 30 + 30 = 60 of 80)
  const qcReceiptPayload = {
    purchaseOrderId: poId,
    warehouseId: 'wh-01',
    carrierName: 'FedEx Freight',
    trackingNumber: 'FX-8849102-B',
    billOfLading: 'BOL-9902',
    notes: 'Second delivery with damaged units',
    items: [
      {
        poLineItemId: poLineId,
        productId: 'prod-01',
        locationId: 'loc-01',
        quantityAccepted: 20,
        quantityRejected: 10,
        batchNumber: 'LOT-2026-F2',
        rejectionReason: 'Damaged motor casings caused by carton puncture'
      }
    ]
  };

  const qcReceiptRes = await request(app, 'POST', '/api/v1/goods-receipts/confirm', staffHeaders, qcReceiptPayload);
  assert(qcReceiptRes.status === 201, 'QC Goods Receipt confirmed with 201 Created');
  assert(qcReceiptRes.body.data?.receipt?.items[0]?.quantityRejected === 10, 'Recorded 10 rejected units');
  assert(qcReceiptRes.body.data?.receipt?.items[0]?.rejectionReason?.includes('Damaged motor casings'), 'Recorded rejection reason');

  // Verify ONLY accepted units (20) incremented good inventory, NOT rejected (10)
  const invAfterQC = await request(
    app,
    'GET',
    '/api/v1/inventory?productId=prod-01&locationId=loc-01',
    staffHeaders
  );
  const onHandAfterQC = invAfterQC.body.items[0]?.quantityOnHand;
  assert(
    onHandAfterQC === onHandAfter1 + 20,
    `Good inventory incremented strictly by accepted quantity (+20 units, on-hand now ${onHandAfterQC})`
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 5: Over-Receiving Prevention Guard
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 5: Over-Receiving Prevention Guard');

  // Ordered: 80. Already received: 30 + 30 = 60. Remaining: 20.
  // Attempting to receive 25 units must be rejected with 422 OVER_RECEIVING_NOT_ALLOWED
  const overReceivingAttempt = await request(app, 'POST', '/api/v1/goods-receipts/confirm', staffHeaders, {
    purchaseOrderId: poId,
    warehouseId: 'wh-01',
    items: [
      {
        poLineItemId: poLineId,
        productId: 'prod-01',
        locationId: 'loc-01',
        quantityAccepted: 25,
        quantityRejected: 0
      }
    ]
  });
  assert(overReceivingAttempt.status === 422, 'Over-receiving attempt rejected with 422 Unprocessable Entity');
  assert(overReceivingAttempt.body.error?.code === 'OVER_RECEIVING_NOT_ALLOWED', 'Error code specifies OVER_RECEIVING_NOT_ALLOWED');

  // -------------------------------------------------------------------------
  // TEST SUITE 6: Final Delivery & Complete PO Fulfillment
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 6: Complete PO Fulfillment (Transition to FULLY_RECEIVED)');

  // Receiving final 20 units
  const finalReceipt = await request(app, 'POST', '/api/v1/goods-receipts/confirm', staffHeaders, {
    purchaseOrderId: poId,
    warehouseId: 'wh-01',
    carrierName: 'FedEx Freight',
    trackingNumber: 'FX-8849102-FINAL',
    items: [
      {
        poLineItemId: poLineId,
        productId: 'prod-01',
        locationId: 'loc-01',
        quantityAccepted: 20,
        quantityRejected: 0
      }
    ]
  });
  assert(finalReceipt.status === 201, 'Final delivery receipt confirmed (201 Created)');
  assert(finalReceipt.body.data?.purchaseOrder?.status === 'FULLY_RECEIVED', 'PO status successfully transitioned to FULLY_RECEIVED');

  // -------------------------------------------------------------------------
  // TEST SUITE 7: Duplicate Confirmation Protection
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 7: Duplicate Confirmation Protection');

  // Attempting to receive goods for an already fully received PO
  const duplicateOnFullPo = await request(app, 'POST', '/api/v1/goods-receipts/confirm', staffHeaders, {
    purchaseOrderId: poId,
    warehouseId: 'wh-01',
    items: [
      {
        poLineItemId: poLineId,
        productId: 'prod-01',
        locationId: 'loc-01',
        quantityAccepted: 1,
        quantityRejected: 0
      }
    ]
  });
  assert(duplicateOnFullPo.status === 409, 'Receipt against FULLY_RECEIVED PO rejected with 409 Conflict');

  // Attempting to submit duplicate tracking number
  const dupTrackingRes = await request(app, 'POST', '/api/v1/goods-receipts/confirm', staffHeaders, {
    purchaseOrderId: 'po-02',
    warehouseId: 'wh-01',
    trackingNumber: 'DHL-99482104', // Already exists on po-02
    items: [
      {
        poLineItemId: 'poli-02',
        productId: 'prod-03',
        locationId: 'loc-02',
        quantityAccepted: 5,
        quantityRejected: 0
      }
    ]
  });
  assert(dupTrackingRes.status === 409, 'Duplicate tracking number submission rejected with 409 Conflict');

  // -------------------------------------------------------------------------
  // TEST SUITE 8: PO Details & Receipt History Retrieval
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 8: PO Details & Goods Receipts History');

  const poDetails = await request(app, 'GET', `/api/v1/purchase-orders/${poId}`, staffHeaders);
  assert(poDetails.status === 200, 'GET /api/v1/purchase-orders/:id returns 200 OK');
  assert(poDetails.body.data?.goodsReceipts?.length === 3, 'PO details includes complete receipt history (3 receipts)');

  const allReceipts = await request(app, 'GET', `/api/v1/goods-receipts?purchaseOrderId=${poId}`, staffHeaders);
  assert(allReceipts.status === 200, 'GET /api/v1/goods-receipts returns 200 OK');
  assert(allReceipts.body.data?.length === 3, 'Receipts endpoint lists all 3 Goods Receipt Notes');

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
    console.log('ALL PURCHASING & GOODS RECEIVING TESTS PASSED! ✓\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
