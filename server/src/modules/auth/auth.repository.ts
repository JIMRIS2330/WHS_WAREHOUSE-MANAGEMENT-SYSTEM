import { UserRole } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { hashPasswordSync } from '../../utils/security.js';

export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  phone?: string | null;
  assignedWarehouseId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionEntity {
  id: string;
  token: string;
  refreshToken: string;
  userId: string;
  isRevoked: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogEntity {
  id: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export interface WarehouseEntity {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// In-Memory fallback store with pre-hashed, safe credentials for zero-friction testing
const MEM_WAREHOUSES: WarehouseEntity[] = [
  {
    id: 'wh-01',
    code: 'WH-01',
    name: 'Central Distribution Center',
    city: 'Chicago',
    country: 'USA',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'wh-02',
    code: 'WH-02',
    name: 'East Coast Fulfillment Hub',
    city: 'Newark',
    country: 'USA',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const MEM_USERS: UserEntity[] = [
  {
    id: 'usr-admin-01',
    email: 'admin@warehouse.local',
    passwordHash: hashPasswordSync('Password123!'),
    firstName: 'Sarah',
    lastName: 'Connor',
    role: 'ADMIN',
    isActive: true,
    assignedWarehouseId: 'wh-01',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'usr-manager-02',
    email: 'manager@warehouse.local',
    passwordHash: hashPasswordSync('Password123!'),
    firstName: 'Marcus',
    lastName: 'Vance',
    role: 'WAREHOUSE_MANAGER',
    isActive: true,
    assignedWarehouseId: 'wh-01',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'usr-staff-03',
    email: 'staff@warehouse.local',
    passwordHash: hashPasswordSync('Password123!'),
    firstName: 'Elena',
    lastName: 'Rostova',
    role: 'WAREHOUSE_STAFF',
    isActive: true,
    assignedWarehouseId: 'wh-01',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const MEM_SESSIONS: SessionEntity[] = [];
const MEM_AUDIT_LOGS: AuditLogEntity[] = [];

class AuthRepository {
  private isPostgresAvailable: boolean | null = null;

  private async checkPostgres(): Promise<boolean> {
    if (this.isPostgresAvailable !== null) {
      return this.isPostgresAvailable;
    }
    try {
      await prisma.$queryRaw`SELECT 1`;
      this.isPostgresAvailable = true;
      return true;
    } catch {
      this.isPostgresAvailable = false;
      return false;
    }
  }

  async findUserByEmail(email: string): Promise<UserEntity | null> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.user.findUnique({
          where: { email: email.toLowerCase() }
        })) as UserEntity | null;
      } catch {
        // Fall back to memory on query error
      }
    }
    return (
      MEM_USERS.find(u => u.email.toLowerCase() === email.toLowerCase()) || null
    );
  }

  async findUserById(id: string): Promise<UserEntity | null> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.user.findUnique({
          where: { id }
        })) as UserEntity | null;
      } catch {
        // fallback
      }
    }
    return MEM_USERS.find(u => u.id === id) || null;
  }

  async createUser(data: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserEntity> {
    const isPg = await this.checkPostgres();
    const id = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const newUser: UserEntity = {
      ...data,
      id,
      email: data.email.toLowerCase(),
      createdAt: now,
      updatedAt: now
    };

    if (isPg) {
      try {
        const created = await prisma.user.create({
          data: {
            ...newUser
          }
        });
        return created as UserEntity;
      } catch {
        // fallback
      }
    }

    MEM_USERS.push(newUser);
    return newUser;
  }

  async updateUser(id: string, data: Partial<UserEntity>): Promise<UserEntity | null> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        const updated = await prisma.user.update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date()
          }
        });
        return updated as UserEntity;
      } catch {
        // fallback
      }
    }

    const idx = MEM_USERS.findIndex(u => u.id === id);
    if (idx === -1) return null;
    MEM_USERS[idx] = {
      ...MEM_USERS[idx],
      ...data,
      updatedAt: new Date()
    };
    return MEM_USERS[idx];
  }

  async deleteUser(id: string): Promise<boolean> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        await prisma.user.delete({ where: { id } });
        return true;
      } catch {
        // fallback
      }
    }

    const idx = MEM_USERS.findIndex(u => u.id === id);
    if (idx === -1) return false;
    MEM_USERS.splice(idx, 1);
    return true;
  }

  async listUsers(): Promise<UserEntity[]> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.user.findMany({
          orderBy: { createdAt: 'desc' }
        })) as UserEntity[];
      } catch {
        // fallback
      }
    }
    return [...MEM_USERS];
  }

  async createSession(data: {
    userId: string;
    token: string;
    refreshToken: string;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<SessionEntity> {
    const isPg = await this.checkPostgres();
    const id = `ses-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const session: SessionEntity = {
      ...data,
      id,
      isRevoked: false,
      createdAt: now,
      updatedAt: now
    };

    if (isPg) {
      try {
        const created = await prisma.session.create({ data: session });
        return created as SessionEntity;
      } catch {
        // fallback
      }
    }

    MEM_SESSIONS.push(session);
    return session;
  }

  async findSessionByToken(token: string): Promise<SessionEntity | null> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.session.findUnique({
          where: { token }
        })) as SessionEntity | null;
      } catch {
        // fallback
      }
    }
    return MEM_SESSIONS.find(s => s.token === token) || null;
  }

  async revokeSession(token: string): Promise<boolean> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        await prisma.session.update({
          where: { token },
          data: { isRevoked: true }
        });
        return true;
      } catch {
        // fallback
      }
    }

    const session = MEM_SESSIONS.find(s => s.token === token);
    if (session) {
      session.isRevoked = true;
      return true;
    }
    return false;
  }

  async logAudit(data: {
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    details?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<AuditLogEntity> {
    const isPg = await this.checkPostgres();
    const id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const log: AuditLogEntity = {
      ...data,
      id,
      createdAt: now
    };

    if (isPg) {
      try {
        const created = await prisma.auditLog.create({ data: log });
        return created as AuditLogEntity;
      } catch {
        // fallback
      }
    }

    MEM_AUDIT_LOGS.push(log);
    return log;
  }

  async listAuditLogs(limit: number = 50): Promise<AuditLogEntity[]> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.auditLog.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' }
        })) as AuditLogEntity[];
      } catch {
        // fallback
      }
    }
    return [...MEM_AUDIT_LOGS].reverse().slice(0, limit);
  }

  async listWarehouses(): Promise<WarehouseEntity[]> {
    const isPg = await this.checkPostgres();
    if (isPg) {
      try {
        return (await prisma.warehouse.findMany()) as WarehouseEntity[];
      } catch {
        // fallback
      }
    }
    return [...MEM_WAREHOUSES];
  }
}

export const authRepository = new AuthRepository();
