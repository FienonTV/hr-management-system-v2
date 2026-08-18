import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

async function main() {
  const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  const defs = await prisma.moduleDefinition.findMany({ orderBy: { key: 'asc' } });
  const tms = await prisma.tenantModule.findMany({ include: { module: true } });
  console.log('=== ModuleDefinitions ===');
  defs.forEach((d: any) => console.log(d.key, d.name, d.isCore));
  console.log('=== TenantModules ===');
  tms.forEach((tm: any) => console.log(tm.module.key, tm.isActive, tm.tenantId));
  await prisma.$disconnect();
}
main().catch((e: any) => { console.error(e); process.exit(1); });
