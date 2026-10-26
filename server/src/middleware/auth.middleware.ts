import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { verifyAccessToken, sanitizeUser, SanitizedUser } from '../utils/security.js';
import { authRepository } from '../modules/auth/auth.repository.js';

// Extend Express Request interface to include authenticated user & token
declare global {
  namespace Express {
    interface Request {
      user?: SanitizedUser;
      token?: string;
    }
  }
}

/**
 * Middleware: Verifies Bearer JWT access token and session validity
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token missing or invalid format'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED_OR_INVALID',
        message: 'The provided authentication token is invalid or has expired'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Verify session revocation state
  const session = await authRepository.findSessionByToken(token);
  if (session && session.isRevoked) {
    res.status(401).json({
      success: false,
      error: {
        code: 'SESSION_REVOKED',
        message: 'Your session has been terminated or logged out'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  const user = await authRepository.findUserById(payload.userId);
  if (!user || !user.isActive) {
    res.status(401).json({
      success: false,
      error: {
        code: 'USER_DEACTIVATED',
        message: 'Account not found or has been disabled by an administrator'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  req.user = sanitizeUser(user);
  req.token = token;
  next();
};

/**
 * Middleware: Enforces Role-Based Access Control (RBAC)
 * Verifies that the authenticated user possesses at least one of the permitted roles
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Record security audit event for unauthorized privilege escalation attempt
      authRepository.logAudit({
        userId: req.user.id,
        action: 'ACCESS_DENIED',
        entity: req.baseUrl + req.path,
        details: `Role ${req.user.role} attempted access to route requiring [${allowedRoles.join(', ')}]`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Forbidden: requires one of [${allowedRoles.join(', ')}] permissions`
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};
