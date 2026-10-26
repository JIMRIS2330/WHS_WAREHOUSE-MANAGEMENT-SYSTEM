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
  console.log(' WMS Phase 6: Customer Orders & Outbound Fulfillment Automated Tests  ');
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
  // TEST SUITE 1: Customer Management CRUD & RBAC
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 1: Customer Management CRUD & RBAC');

  // Staff cannot create customer
  const staffCustCreate = await request(app, 'POST', '/api/v1/customers', staffHeaders, {
    code: 'CUST-FORBIDDEN',
    name: 'Forbidden Corp',
    email: 'test@forbidden.com',
    phone: '555-0100',
    address: '100 Road',
    city: 'City',
    country: 'Country'
  });
  assert(staffCustCreate.status === 403, 'Warehouse Staff is forbidden (403) from creating customers');

  // Admin creates customer
  const custCode = `CUST-${Date.now().toString().slice(-4)}`;
  const validCustPayload = {
    code: custCode,
    name: `AeroSpace Dynamics ${custCode}`,
    contactName: 'Elena Rostova',
    email: `orders@aerospace-${custCode.toLowerCase()}.com`,
    phone: '+1-206-555-0188',
    address: '777 Aviation Way, Hangar B',
    city: 'Seattle',
    country: 'USA'
  };

  const createCustRes = await request(app, 'POST', '/api/v1/customers', adminHeaders, validCustPayload);
  assert(createCustRes.status === 201, 'Create customer succeeds with 201 Created');
  const customerId = createCustRes.body.data?.id;
  assert(!!customerId, 'Customer record created with UUID');

  // Duplicate code rejected
  const dupCustRes = await request(app, 'POST', '/api/v1/customers', adminHeaders, validCustPayload);
  assert(dupCustRes.status === 409, 'Duplicate customer code is rejected with 409 Conflict');

  // -------------------------------------------------------------------------
  // TEST SUITE 2: Customer Order Creation & Validation
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 2: Customer Order Creation & Validation');

  // Empty line items rejected
  const emptyOrder = await request(app, 'POST', '/api/v1/orders', adminHeaders, {
    customerId,
    warehouseId: 'wh-01',
    lineItems: []
  });
  assert(emptyOrder.status === 400, 'Customer order with empty line items rejected (400 Bad Request)');

  // Valid Order Creation in DRAFT status
  const validOrderPayload = {
    customerId,
    warehouseId: 'wh-01',
    notes: 'Urgent aviation replacement order',
    lineItems: [
      { productId: 'prod-01', quantityOrdered: 5, unitPrice: 89.0 }
    ]
  };

  const createOrderRes = await request(app, 'POST', '/api/v1/orders', adminHeaders, validOrderPayload);
  assert(createOrderRes.status === 201, 'Customer order created with 201 Created');
  assert(createOrderRes.body.data?.status === 'DRAFT', 'Initial order status is DRAFT');
  assert(createOrderRes.body.data?.totalAmount === 445.0, 'Total amount calculated correctly ($445.00)');
  const orderId = createOrderRes.body.data?.id;
  const orderNumber = createOrderRes.body.data?.orderNumber;

  // -------------------------------------------------------------------------
  // TEST SUITE 3: Stock Reservation & Order Allocation
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 3: Stock Reservation & Order Allocation');

  // Order with excessive stock requirement should be rejected
  const excessiveOrder = await request(app, 'POST', '/api/v1/orders', adminHeaders, {
    customerId,
    warehouseId: 'wh-01',
    lineItems: [{ productId: 'prod-01', quantityOrdered: 99999, unitPrice: 89.0 }]
  });
  const excessiveOrderId = excessiveOrder.body.data?.id;
  const excessiveAllocRes = await request(app, 'POST', `/api/v1/orders/${excessiveOrderId}/confirm`, adminHeaders);
  assert(excessiveAllocRes.status === 422, 'Order allocation exceeding available stock rejected with 422 Unprocessable Entity');
  assert(excessiveAllocRes.body.error?.code === 'INSUFFICIENT_STOCK', 'Error code indicates INSUFFICIENT_STOCK');

  // Inspect inventory available ATP before confirming valid order
  const invBefore = await request(app, 'GET', '/api/v1/inventory?productId=prod-01', staffHeaders);
  const prodItemBefore = invBefore.body.items[0];
  const reservedBefore = prodItemBefore.quantityReserved;
  const availableBefore = prodItemBefore.quantityAvailable;

  // Confirm and Allocate valid order
  const confirmOrderRes = await request(app, 'POST', `/api/v1/orders/${orderId}/confirm`, adminHeaders);
  assert(confirmOrderRes.status === 200, 'Order confirmation succeeds with 200 OK');
  assert(confirmOrderRes.body.data?.status === 'ALLOCATED', 'Order status transitioned to ALLOCATED');
  assert(confirmOrderRes.body.data?.lineItems[0]?.quantityReserved === 5, 'Line item tracks 5 units reserved');

  // Verify inventory engine reserved stock increased by exactly 5 units and Available decreased
  const invAfterAlloc = await request(app, 'GET', '/api/v1/inventory?productId=prod-01', staffHeaders);
  const prodItemAfterAlloc = invAfterAlloc.body.items[0];
  assert(
    prodItemAfterAlloc.quantityReserved === reservedBefore + 5,
    `Reserved stock increased by 5 units (${reservedBefore} -> ${prodItemAfterAlloc.quantityReserved})`
  );
  assert(
    prodItemAfterAlloc.quantityAvailable === availableBefore - 5,
    `Available ATP decreased by 5 units (${availableBefore} -> ${prodItemAfterAlloc.quantityAvailable})`
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 4: Order Cancellation & Reservation Release
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 4: Order Cancellation & Reservation Release');

  // Create another order to test cancellation release
  const cancelTestOrder = await request(app, 'POST', '/api/v1/orders', adminHeaders, {
    customerId,
    warehouseId: 'wh-01',
    lineItems: [{ productId: 'prod-03', quantityOrdered: 10, unitPrice: 35.0 }]
  });
  const cancelOrderId = cancelTestOrder.body.data?.id;

  // Allocate it
  await request(app, 'POST', `/api/v1/orders/${cancelOrderId}/confirm`, adminHeaders);

  // Check inventory reserved for prod-03
  const invProd3Before = await request(app, 'GET', '/api/v1/inventory?productId=prod-03', staffHeaders);
  const reservedProd3 = invProd3Before.body.items[0]?.quantityReserved;

  // Cancel order
  const cancelRes = await request(app, 'POST', `/api/v1/orders/${cancelOrderId}/cancel`, adminHeaders, {
    reason: 'Customer change of project specifications'
  });
  assert(cancelRes.status === 200, 'Order cancellation succeeds with 200 OK');
  assert(cancelRes.body.data?.status === 'CANCELLED', 'Order status updated to CANCELLED');

  // Verify reservation released back to available inventory
  const invProd3After = await request(app, 'GET', '/api/v1/inventory?productId=prod-03', staffHeaders);
  assert(
    invProd3After.body.items[0]?.quantityReserved === reservedProd3 - 10,
    'Reserved inventory released back to available pool upon order cancellation'
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 5: Location-Based Picking Workstation
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 5: Location-Based Picking Workstation');

  // Query pick tasks generated for orderId
  const pickTasksRes = await request(app, 'GET', `/api/v1/pick-tasks?orderId=${orderId}`, staffHeaders);
  assert(pickTasksRes.status === 200, 'GET /api/v1/pick-tasks returns 200 OK');
  assert(pickTasksRes.body.data?.length >= 1, 'Pick tasks generated and linked to order');
  const pickTask = pickTasksRes.body.data[0];
  const pickTaskId = pickTask.id;
  assert(pickTask.status === 'PENDING', 'Pick task initialized in PENDING status');
  assert(pickTask.quantityToPick === 5, 'Pick task targets exact quantity of 5 units');
  assert(!!pickTask.location?.barcode, 'Pick task specifies storage bin location barcode');

  // Over-picking guard
  const overpickAttempt = await request(app, 'POST', `/api/v1/pick-tasks/${pickTaskId}/confirm`, staffHeaders, {
    quantityPicked: 10 // To pick is 5
  });
  assert(overpickAttempt.status === 422, 'Over-picking attempt rejected with 422 Unprocessable Entity');
  assert(overpickAttempt.body.error?.code === 'OVER_PICKING_BLOCKED', 'Error code specifies OVER_PICKING_BLOCKED');

  // Confirm valid pick
  const validPickRes = await request(app, 'POST', `/api/v1/pick-tasks/${pickTaskId}/confirm`, staffHeaders, {
    quantityPicked: 5,
    notes: 'Scanned pick-face bin WH1-Z01-A01-R01-S01-B01'
  });
  assert(validPickRes.status === 200, 'Pick task confirmed with 200 OK');
  assert(validPickRes.body.data?.task?.status === 'PICKED', 'Pick task status updated to PICKED');
  assert(validPickRes.body.data?.order?.status === 'PICKED', 'Order status transitioned to PICKED');

  // -------------------------------------------------------------------------
  // TEST SUITE 6: Packing Station Confirmation
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 6: Packing Station Confirmation');

  const packRes = await request(app, 'POST', `/api/v1/orders/${orderId}/pack`, staffHeaders, {
    packageNotes: 'Carton #BOX-4401 packed with protective foam'
  });
  assert(packRes.status === 200, 'Packing confirmation succeeds with 200 OK');
  assert(packRes.body.data?.status === 'PACKED', 'Order status transitioned to PACKED');
  assert(packRes.body.data?.lineItems[0]?.quantityPacked === 5, 'Line item records 5 units packed');

  // -------------------------------------------------------------------------
  // TEST SUITE 7: Dispatch & Physical Stock Deduction (The Golden Invariant)
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 7: Dispatch & Physical Stock Deduction');

  // Fetch on-hand physical stock before dispatch
  const invBeforeDispatch = await request(app, 'GET', '/api/v1/inventory?productId=prod-01', staffHeaders);
  const onHandBeforeDispatch = invBeforeDispatch.body.items[0]?.quantityOnHand;

  // Confirm Dispatch & Shipping
  const dispatchPayload = {
    carrierName: 'DHL Global Express',
    trackingNumber: 'DHL-EXP-2026-99001',
    shippingMethod: 'Express Air Freight',
    notes: 'Dock 4 dispatched to courier'
  };

  const dispatchRes = await request(app, 'POST', `/api/v1/orders/${orderId}/dispatch`, staffHeaders, dispatchPayload);
  assert(dispatchRes.status === 200, 'Dispatch confirmation succeeds with 200 OK');
  assert(dispatchRes.body.data?.order?.status === 'DISPATCHED', 'Order status transitioned to DISPATCHED');
  const dispatchNumber = dispatchRes.body.data?.shipment?.dispatchNumber;
  assert(!!dispatchNumber, `Generated sequential dispatch number: ${dispatchNumber}`);

  // CRITICAL INVARIANT: Verify physical on-hand stock was deducted exactly once by 5 units
  const invAfterDispatch = await request(app, 'GET', '/api/v1/inventory?productId=prod-01', staffHeaders);
  const onHandAfterDispatch = invAfterDispatch.body.items[0]?.quantityOnHand;
  assert(
    onHandAfterDispatch === onHandBeforeDispatch - 5,
    `Physical On-Hand stock deducted exactly once by 5 units (${onHandBeforeDispatch} -> ${onHandAfterDispatch})`
  );

  // Verify stock movement ledger entry for dispatch
  const movementsRes = await request(
    app,
    'GET',
    `/api/v1/inventory/movements?productId=prod-01&limit=5`,
    staffHeaders
  );
  const dispatchMovement = movementsRes.body.data[0];
  assert(dispatchMovement.movementType === 'STOCK_OUT', 'Dispatched movement recorded with type STOCK_OUT');
  assert(dispatchMovement.referenceId === dispatchNumber, 'Movement references exact shipment dispatch number');

  // -------------------------------------------------------------------------
  // TEST SUITE 8: Duplicate Dispatch & Invalid State Protections
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 8: Duplicate Dispatch & Invalid State Protections');

  // Attempting to dispatch an already DISPATCHED order must fail with 409 Conflict
  const duplicateDispatch = await request(
    app,
    'POST',
    `/api/v1/orders/${orderId}/dispatch`,
    staffHeaders,
    dispatchPayload
  );
  assert(duplicateDispatch.status === 409, 'Duplicate dispatch on already DISPATCHED order rejected with 409 Conflict');
  assert(duplicateDispatch.body.error?.code === 'ALREADY_DISPATCHED', 'Error code indicates ALREADY_DISPATCHED');

  // Attempting to cancel a DISPATCHED order must fail with 400
  const cancelDispatched = await request(app, 'POST', `/api/v1/orders/${orderId}/cancel`, adminHeaders, {
    reason: 'Too late'
  });
  assert(cancelDispatched.status === 400, 'Cancelling an already dispatched order is rejected (400 Bad Request)');

  // -------------------------------------------------------------------------
  // TEST SUITE 9: Shipments Query & Tracking Ledger
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 9: Shipments Query & Tracking Ledger');

  const shipmentsRes = await request(app, 'GET', `/api/v1/shipments?orderId=${orderId}`, staffHeaders);
  assert(shipmentsRes.status === 200, 'GET /api/v1/shipments returns 200 OK');
  assert(shipmentsRes.body.data?.length === 1, 'Shipments ledger lists completed dispatch record');
  assert(shipmentsRes.body.data[0]?.carrierName === 'DHL Global Express', 'Shipment records carrier name');
  assert(shipmentsRes.body.data[0]?.trackingNumber === 'DHL-EXP-2026-99001', 'Shipment records tracking number');

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
    console.log('ALL CUSTOMER ORDERS & OUTBOUND FULFILLMENT TESTS PASSED! ✓\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
