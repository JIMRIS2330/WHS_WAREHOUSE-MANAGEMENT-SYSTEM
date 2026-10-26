import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ENV } from '../config/env.js';
import { UserRole } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  assignedWarehouseId?: string | null;
}

export interface SanitizedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  phone?: string | null;
  assignedWarehouseId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SALT_ROUNDS = 10;

/**
 * Securely hashes a plain-text password using bcrypt with salt rounds
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Synchronous hash helper for seeding
 */
export const hashPasswordSync = (password: string): string => {
  return bcrypt.hashSync(password, SALT_ROUNDS);
};

/**
 * Constant-time comparison between plain-text password and bcrypt hash
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Generates a signed, short-lived JWT access token
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: '1h',
    algorithm: 'HS256'
  });
};

/**
 * Verifies and decodes a JWT access token
 */
export const verifyAccessToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
};

/**
 * Generates a cryptographically strong random token for refresh sessions
 */
export const generateRefreshToken = (): string => {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * Sanitizes a user entity by stripping out sensitive password hashes
 */
export const sanitizeUser = (user: any): SanitizedUser => {
  const { passwordHash, ...safeUser } = user;
  return {
    ...safeUser,
    name: `${safeUser.firstName} ${safeUser.lastName}`.trim()
  };
};
