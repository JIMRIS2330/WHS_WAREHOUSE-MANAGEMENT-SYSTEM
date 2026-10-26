import { createApp } from '../app.js';
import { comparePassword, hashPassword, verifyAccessToken } from '../utils/security.js';
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
  console.log(' WMS Phase 2: Automated Authentication & RBAC Test Suite Execution    ');
  console.log('======================================================================\n');

  const app = createApp();

  // -------------------------------------------------------------------------
  // 1. Password Hashing Security Tests
  // -------------------------------------------------------------------------
  console.log('TEST SUITE 1: Password Hashing & Cryptographic Security');
  const plainPassword = 'SuperSecretPassword2026!';
  const hashed = await hashPassword(plainPassword);

  assert(
    hashed !== plainPassword && hashed.startsWith('$2'),
    'Passwords must be hashed with bcrypt (salt rounds)',
    'Hash is identical to plain-text or invalid format'
  );

  const passwordMatches = await comparePassword(plainPassword, hashed);
  assert(passwordMatches, 'bcrypt compare must verify correct password');

  const wrongPasswordMatches = await comparePassword('WrongPassword123!', hashed);
  assert(!wrongPasswordMatches, 'bcrypt compare must reject incorrect password');

  // -------------------------------------------------------------------------
  // 2. Server-Side Request Validation Tests (Zod)
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 2: Server-Side Request Validation (Zod)');
  const invalidEmailRes = await request(app, 'POST', '/api/v1/auth/login', {}, {
    email: 'not-an-email',
    password: 'password123'
  });
  assert(
    invalidEmailRes.status === 400 && invalidEmailRes.body.error?.code === 'VALIDATION_ERROR',
    'Login rejects invalid email format with 400 Bad Request'
  );

  const shortPasswordRes = await request(app, 'POST', '/api/v1/auth/login', {}, {
    email: 'valid@warehouse.local',
    password: '123'
  });
  assert(
    shortPasswordRes.status === 400 && shortPasswordRes.body.error?.code === 'VALIDATION_ERROR',
    'Login rejects passwords shorter than 6 characters with 400 Bad Request'
  );

  // -------------------------------------------------------------------------
  // 3. Authentication & Credential Verification Tests
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 3: Credential Verification & JWT Token Issuance');
  const wrongPasswordRes = await request(app, 'POST', '/api/v1/auth/login', {}, {
    email: 'admin@warehouse.local',
    password: 'IncorrectPassword999!'
  });
  assert(
    wrongPasswordRes.status === 401 && wrongPasswordRes.body.error?.code === 'INVALID_CREDENTIALS',
    'Login with incorrect password returns 401 Unauthorized'
  );

  // Successful Admin Login
  const adminLoginRes = await request(app, 'POST', '/api/v1/auth/login', {}, {
    email: 'admin@warehouse.local',
    password: 'Password123!'
  });
  assert(adminLoginRes.status === 200, 'Admin login with valid credentials succeeds (200 OK)');
  assert(!!adminLoginRes.body.data?.token, 'Login issues a signed JWT access token');
  assert(
    adminLoginRes.body.data?.user?.passwordHash === undefined,
    'Password hash is never exposed to the client in response payload'
  );

  const adminToken = adminLoginRes.body.data?.token;
  const decodedAdmin = verifyAccessToken(adminToken);
  assert(decodedAdmin?.role === 'ADMIN', 'JWT token payload embeds correct ADMIN role');

  // Successful Manager Login
  const managerLoginRes = await request(app, 'POST', '/api/v1/auth/login', {}, {
    email: 'manager@warehouse.local',
    password: 'Password123!'
  });
  assert(managerLoginRes.status === 200, 'Manager login succeeds with 200 OK');
  const managerToken = managerLoginRes.body.data?.token;

  // Successful Staff Login
  const staffLoginRes = await request(app, 'POST', '/api/v1/auth/login', {}, {
    email: 'staff@warehouse.local',
    password: 'Password123!'
  });
  assert(staffLoginRes.status === 200, 'Staff login succeeds with 200 OK');
  const staffToken = staffLoginRes.body.data?.token;

  // -------------------------------------------------------------------------
  // 4. Protected Route & Token Middleware Tests
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 4: Protected Endpoints & Token Authentication');
  const unauthMeRes = await request(app, 'GET', '/api/v1/auth/me');
  assert(
    unauthMeRes.status === 401 && unauthMeRes.body.error?.code === 'UNAUTHORIZED',
    'Accessing protected route without Authorization header is blocked (401)'
  );

  const forgedTokenRes = await request(app, 'GET', '/api/v1/auth/me', {
    Authorization: 'Bearer invalid_tampered_token_string'
  });
  assert(
    forgedTokenRes.status === 401 && forgedTokenRes.body.error?.code === 'TOKEN_EXPIRED_OR_INVALID',
    'Accessing protected route with forged token is blocked (401)'
  );

  const validMeRes = await request(app, 'GET', '/api/v1/auth/me', {
    Authorization: `Bearer ${adminToken}`
  });
  assert(
    validMeRes.status === 200 && validMeRes.body.data?.user?.email === 'admin@warehouse.local',
    'Accessing /api/v1/auth/me with valid Bearer token returns current user profile (200 OK)'
  );

  // -------------------------------------------------------------------------
  // 5. Role-Based Access Control (RBAC) Enforcement Tests
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 5: Role-Based Access Control (RBAC) Protection');

  // 5a. Admin creates a new user
  const newStaffEmail = `newstaff.${Date.now()}@warehouse.local`;
  const createUserByAdminRes = await request(
    app,
    'POST',
    '/api/v1/users',
    { Authorization: `Bearer ${adminToken}` },
    {
      email: newStaffEmail,
      password: 'SecurePassword2026!',
      firstName: 'Alex',
      lastName: 'Chen',
      role: 'WAREHOUSE_STAFF'
    }
  );
  assert(
    createUserByAdminRes.status === 201 && createUserByAdminRes.body.data?.email === newStaffEmail,
    'ADMIN has permission to create users via POST /api/v1/users (201 Created)'
  );

  // 5b. WAREHOUSE_STAFF attempts to create a new user (Privilege Escalation Attack)
  const staffCreateUserRes = await request(
    app,
    'POST',
    '/api/v1/users',
    { Authorization: `Bearer ${staffToken}` },
    {
      email: 'hacker@warehouse.local',
      password: 'HackerPassword2026!',
      firstName: 'Malicious',
      lastName: 'Actor',
      role: 'ADMIN'
    }
  );
  assert(
    staffCreateUserRes.status === 403 && staffCreateUserRes.body.error?.code === 'FORBIDDEN',
    'WAREHOUSE_STAFF is strictly forbidden from creating users (403 Forbidden)'
  );

  // 5c. WAREHOUSE_MANAGER attempts to delete a user (Admin-only action)
  const managerDeleteRes = await request(
    app,
    'DELETE',
    `/api/v1/users/${createUserByAdminRes.body.data?.id}`,
    { Authorization: `Bearer ${managerToken}` }
  );
  assert(
    managerDeleteRes.status === 403 && managerDeleteRes.body.error?.code === 'FORBIDDEN',
    'WAREHOUSE_MANAGER is forbidden from deleting users (403 Forbidden)'
  );

  // 5d. WAREHOUSE_MANAGER viewing user directory
  const managerListUsersRes = await request(app, 'GET', '/api/v1/users', {
    Authorization: `Bearer ${managerToken}`
  });
  assert(
    managerListUsersRes.status === 200 && Array.isArray(managerListUsersRes.body.data),
    'WAREHOUSE_MANAGER is permitted to view user directory (200 OK)'
  );

  // 5e. WAREHOUSE_STAFF viewing sensitive audit logs
  const staffAuditRes = await request(app, 'GET', '/api/v1/auth/audit-logs', {
    Authorization: `Bearer ${staffToken}`
  });
  assert(
    staffAuditRes.status === 403 && staffAuditRes.body.error?.code === 'FORBIDDEN',
    'WAREHOUSE_STAFF is forbidden from viewing audit logs (403 Forbidden)'
  );

  // 5f. ADMIN viewing audit logs
  const adminAuditRes = await request(app, 'GET', '/api/v1/auth/audit-logs', {
    Authorization: `Bearer ${adminToken}`
  });
  assert(
    adminAuditRes.status === 200 && Array.isArray(adminAuditRes.body.data),
    'ADMIN is permitted to inspect audit trail (200 OK)'
  );

  // -------------------------------------------------------------------------
  // 6. Session Revocation & Logout Tests
  // -------------------------------------------------------------------------
  console.log('\nTEST SUITE 6: Session Management & Logout Revocation');
  const logoutRes = await request(app, 'POST', '/api/v1/auth/logout', {
    Authorization: `Bearer ${adminToken}`
  });
  assert(logoutRes.status === 200, 'Logout succeeds with 200 OK and revokes active session');

  const revokedAccessRes = await request(app, 'GET', '/api/v1/auth/me', {
    Authorization: `Bearer ${adminToken}`
  });
  assert(
    revokedAccessRes.status === 401 && revokedAccessRes.body.error?.code === 'SESSION_REVOKED',
    'Requests with revoked session tokens are rejected immediately (401 SESSION_REVOKED)'
  );

  // -------------------------------------------------------------------------
  // Summary Report
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(` Test Execution Summary: ${passed}/${total} Passed (${failed} Failed)`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
