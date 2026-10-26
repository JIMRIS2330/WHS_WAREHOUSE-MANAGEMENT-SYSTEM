import { Router } from 'express';
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../modules/users/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Read user directory (ADMIN and WAREHOUSE_MANAGER)
router.get('/', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), listUsers);
router.get('/:id', authorize(['ADMIN', 'WAREHOUSE_MANAGER']), getUserById);

// Manage users (ADMIN only)
router.post('/', authorize(['ADMIN']), createUser);
router.put('/:id', authorize(['ADMIN']), updateUser);
router.delete('/:id', authorize(['ADMIN']), deleteUser);

export default router;
