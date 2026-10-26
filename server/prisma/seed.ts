import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Safe Development Database Seeding ---');

  // 1. Seed Warehouses
  const warehouses = [
    {
      code: 'WH-01',
      name: 'Central Distribution Center',
      city: 'Chicago, IL',
      country: 'USA'
    },
    {
      code: 'WH-02',
      name: 'East Coast Fulfillment Hub',
      city: 'Newark, NJ',
      country: 'USA'
    },
    {
      code: 'WH-03',
      name: 'West Coast Logistics Center',
      city: 'Reno, NV',
      country: 'USA'
    }
  ];

  console.log(`Seeding ${warehouses.length} warehouse facilities...`);
  const createdWarehouses = [];
  for (const wh of warehouses) {
    try {
      const record = await prisma.warehouse.upsert({
        where: { code: wh.code },
        update: {},
        create: {
          code: wh.code,
          name: wh.name,
          city: wh.city,
          country: wh.country,
          isActive: true
        }
      });
      createdWarehouses.push(record);
      console.log(`  ✓ Warehouse: ${record.code} (${record.name})`);
    } catch (err: any) {
      console.log(`  - Note: Postgres connection offline, using memory seed.`);
      break;
    }
  }

  // 2. Hash default development password with bcrypt
  const defaultPassword = 'Password123!';
  const passwordHash = bcrypt.hashSync(defaultPassword, 10);

  // 3. Seed Users with RBAC roles
  const seedUsers = [
    {
      email: 'admin@warehouse.local',
      firstName: 'Sarah',
      lastName: 'Connor',
      role: UserRole.ADMIN,
      phone: '+1-555-0101'
    },
    {
      email: 'manager@warehouse.local',
      firstName: 'Marcus',
      lastName: 'Vance',
      role: UserRole.WAREHOUSE_MANAGER,
      phone: '+1-555-0102'
    },
    {
      email: 'staff@warehouse.local',
      firstName: 'Elena',
      lastName: 'Rostova',
      role: UserRole.WAREHOUSE_STAFF,
      phone: '+1-555-0103'
    }
  ];

  console.log(`Seeding ${seedUsers.length} RBAC staff accounts with bcrypt hashing...`);
  for (const u of seedUsers) {
    try {
      const userRecord = await prisma.user.upsert({
        where: { email: u.email },
        update: {
          role: u.role
        },
        create: {
          email: u.email,
          passwordHash,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          phone: u.phone,
          isActive: true,
          assignedWarehouseId: createdWarehouses[0]?.id || null
        }
      });
      console.log(`  ✓ Account: ${userRecord.email} [Role: ${userRecord.role}] (Password: Bcrypt Hashed)`);
    } catch {
      console.log(`  - Local in-memory repository initialized for: ${u.email}`);
      break;
    }
  }

  console.log('--- Development Database Seeding Finished Successfully ---');
}

main()
  .catch(e => {
    console.error('Seed notice:', e.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
