import { Router } from 'express';
import {
  login,
  logout,
  getMe,
  changePassword,
  getAuditLogs
} from '../modules/auth/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/login', login);

// Authenticated session routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);

// Audit logs inspection (Restricted to ADMIN and WAREHOUSE_MANAGER)
router.get('/audit-logs', authenticate, authorize(['ADMIN', 'WAREHOUSE_MANAGER']), getAuditLogs);

export default router;
