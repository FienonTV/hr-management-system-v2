import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) {
    throw new Error('DIRECT_URL is not set');
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const tenant = await prisma.tenant.findUnique({ where: { externalId: 'default' } });
  if (!tenant) throw new Error('Tenant default not found');

  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@example.com' } },
  });
  if (!user) throw new Error('Admin user not found');

  const role = await prisma.role.findFirst({
    where: { tenantId: tenant.id, name: 'Admin' },
  });
  if (!role) throw new Error('Admin role not found');

  await prisma.userRole.upsert({
    where: {
      tenantId_userId_roleId: {
        tenantId: tenant.id,
        userId: user.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: user.id,
      roleId: role.id,
    },
  });

  console.log('Admin-Rolle wurde dem Admin-User wieder zugewiesen.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
