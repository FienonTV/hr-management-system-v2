import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const MODULE_KEYS = [
  'absences', 'calendar', 'payroll', 'planning', 'projects', 'time-tracking', 'vehicles', 'woocommerce'
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const tenant = await prisma.tenant.findUnique({ where: { slug: 'default' } });
  if (!tenant) throw new Error('default tenant not found');

  for (const key of MODULE_KEYS) {
    const def = await prisma.moduleDefinition.findUnique({ where: { key } });
    if (!def) {
      console.log('skip', key, 'definition not found');
      continue;
    }
    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: def.id } },
      update: { isActive: true },
      create: { tenantId: tenant.id, moduleId: def.id, isActive: true },
    });
    console.log('activated', key, 'for tenant', tenant.id);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
