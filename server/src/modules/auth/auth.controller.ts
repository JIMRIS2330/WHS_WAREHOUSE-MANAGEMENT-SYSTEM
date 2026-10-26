import { Request, Response } from 'express';
import { loginSchema, changePasswordSchema } from './auth.schema.js';
import { authRepository } from './auth.repository.js';
import {
  comparePassword,
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  sanitizeUser
} from '../../utils/security.js';

export const login = async (req: Request, res: Response): Promise<void> => {
  // 1. Server-side validation via Zod
  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  const { email, password } = validation.data;
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.get('user-agent');

  // 2. Lookup user by email
  const user = await authRepository.findUserByEmail(email);
  if (!user || !user.isActive) {
    await authRepository.logAudit({
      action: 'LOGIN_FAILURE',
      entity: 'User',
      details: `Failed login attempt for email: ${email} (User not found or inactive)`,
      ipAddress,
      userAgent
    });

    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  // 3. Constant-time password verification with bcrypt
  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    await authRepository.logAudit({
      userId: user.id,
      action: 'LOGIN_FAILURE',
      entity: 'User',
      entityId: user.id,
      details: 'Failed login attempt (Invalid password)',
      ipAddress,
      userAgent
    });

    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  // 4. Issue access token & cryptographically secure refresh token
  const token = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    assignedWarehouseId: user.assignedWarehouseId
  });

  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // 5. Persist session
  await authRepository.createSession({
    userId: user.id,
    token,
    refreshToken,
    expiresAt,
    ipAddress,
    userAgent
  });

  // 6. Record security audit log
  await authRepository.logAudit({
    userId: user.id,
    action: 'LOGIN_SUCCESS',
    entity: 'Session',
    entityId: user.id,
    details: `User successfully authenticated with role: ${user.role}`,
    ipAddress,
    userAgent
  });

  // 7. Set secure HTTP-only refresh cookie
  res.cookie('wms_refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.status(200).json({
    success: true,
    data: {
      token,
      refreshToken,
      user: sanitizeUser(user)
    },
    message: 'Authentication successful',
    timestamp: new Date().toISOString()
  });
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  if (req.token) {
    await authRepository.revokeSession(req.token);
  }

  if (req.user) {
    await authRepository.logAudit({
      userId: req.user.id,
      action: 'LOGOUT',
      entity: 'Session',
      entityId: req.user.id,
      details: 'User logged out and session revoked',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  }

  res.clearCookie('wms_refresh_token');

  res.status(200).json({
    success: true,
    message: 'Session revoked and logged out successfully',
    timestamp: new Date().toISOString()
  });
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user
    },
    timestamp: new Date().toISOString()
  });
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in' } });
    return;
  }

  const validation = changePasswordSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid password format',
        details: validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      }
    });
    return;
  }

  const user = await authRepository.findUserById(req.user.id);
  if (!user) {
    res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User record not found' } });
    return;
  }

  const { currentPassword, newPassword } = validation.data;
  const isMatch = await comparePassword(currentPassword, user.passwordHash);
  if (!isMatch) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_PASSWORD', message: 'Current password provided is incorrect' }
    });
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await authRepository.updateUser(user.id, { passwordHash });

  await authRepository.logAudit({
    userId: user.id,
    action: 'PASSWORD_CHANGED',
    entity: 'User',
    entityId: user.id,
    details: 'User successfully updated their account password',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(200).json({
    success: true,
    message: 'Password updated successfully'
  });
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const logs = await authRepository.listAuditLogs(limit);
  res.status(200).json({
    success: true,
    data: logs,
    timestamp: new Date().toISOString()
  });
};
