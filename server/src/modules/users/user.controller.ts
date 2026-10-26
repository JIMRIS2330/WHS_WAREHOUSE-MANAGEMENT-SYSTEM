import { Request, Response } from 'express';
import { createUserSchema, updateUserSchema } from '../auth/auth.schema.js';
import { authRepository } from '../auth/auth.repository.js';
import { hashPassword, sanitizeUser } from '../../utils/security.js';

export const listUsers = async (_req: Request, res: Response): Promise<void> => {
  const users = await authRepository.listUsers();
  res.status(200).json({
    success: true,
    data: users.map(sanitizeUser),
    total: users.length,
    timestamp: new Date().toISOString()
  });
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const user = await authRepository.findUserById(id);

  if (!user) {
    res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: `User with ID ${id} was not found` },
      timestamp: new Date().toISOString()
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: sanitizeUser(user),
    timestamp: new Date().toISOString()
  });
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  const validation = createUserSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid user registration input',
        details: validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  const { email, password, firstName, lastName, role, assignedWarehouseId, phone } = validation.data;

  // Check unique email
  const existing = await authRepository.findUserByEmail(email);
  if (existing) {
    res.status(409).json({
      success: false,
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: `A staff account with email ${email} already exists`
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Hash password securely with bcrypt
  const passwordHash = await hashPassword(password);

  const newUser = await authRepository.createUser({
    email,
    passwordHash,
    firstName,
    lastName,
    role,
    isActive: true,
    assignedWarehouseId: assignedWarehouseId || null,
    phone: phone || null
  });

  if (req.user) {
    await authRepository.logAudit({
      userId: req.user.id,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: newUser.id,
      details: `Admin ${req.user.email} created new user ${newUser.email} with role ${newUser.role}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  }

  res.status(201).json({
    success: true,
    data: sanitizeUser(newUser),
    message: 'User account created successfully',
    timestamp: new Date().toISOString()
  });
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const validation = updateUserSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid user update payload',
        details: validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  const user = await authRepository.findUserById(id);
  if (!user) {
    res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: `User with ID ${id} does not exist` },
      timestamp: new Date().toISOString()
    });
    return;
  }

  const updated = await authRepository.updateUser(id, validation.data);

  if (req.user) {
    await authRepository.logAudit({
      userId: req.user.id,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: id,
      details: `Admin ${req.user.email} updated user fields: ${Object.keys(validation.data).join(', ')}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  }

  res.status(200).json({
    success: true,
    data: sanitizeUser(updated!),
    message: 'User account updated successfully',
    timestamp: new Date().toISOString()
  });
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  // Prevent admin self-deletion
  if (req.user && req.user.id === id) {
    res.status(400).json({
      success: false,
      error: { code: 'SELF_DELETION_FORBIDDEN', message: 'You cannot delete your own active administrator account' },
      timestamp: new Date().toISOString()
    });
    return;
  }

  const user = await authRepository.findUserById(id);
  if (!user) {
    res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: `User with ID ${id} does not exist` },
      timestamp: new Date().toISOString()
    });
    return;
  }

  await authRepository.deleteUser(id);

  if (req.user) {
    await authRepository.logAudit({
      userId: req.user.id,
      action: 'USER_DELETED',
      entity: 'User',
      entityId: id,
      details: `Admin ${req.user.email} deleted user account: ${user.email}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  }

  res.status(200).json({
    success: true,
    message: `User ${user.email} deleted successfully`,
    timestamp: new Date().toISOString()
  });
};
