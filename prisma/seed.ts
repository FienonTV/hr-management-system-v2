import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from 'bcryptjs';

async function main() {
  // Seed uses the unrestricted admin DB user (DIRECT_URL) so it can create
  // tenant-scoped rows without needing an RLS tenant context.
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DIRECT_URL or DATABASE_URL must be set");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Schendel GmbH',
      slug: 'default',
      externalId: 'default',
    },
  });

  const hashedPassword = await bcrypt.hash('admin123', 12);

  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@example.com',
      },
    },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: hashedPassword,
      isSystemAdmin: true,
      tenantId: tenant.id,
    },
  });

  // Create the default Admin role for the tenant
  const adminRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: 'Admin',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Admin',
      isAdmin: true,
    },
  });

  // Assign Admin role to the user
  const adminUser = await prisma.user.findUnique({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@example.com',
      },
    },
  });

  await prisma.userRole.upsert({
    where: {
      tenantId_userId_roleId: {
        tenantId: tenant.id,
        userId: adminUser!.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: adminUser!.id,
      roleId: adminRole.id,
    },
  });

  console.log('Seed completed successfully');
  await prisma.$disconnect();
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  });
