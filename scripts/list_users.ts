import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("No DIRECT_URL");
  process.exit(1);
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({ take: 5, include: { tenant: true } });
  for (const u of users) {
    console.log(u.tenant?.externalId || u.tenant?.slug, u.email, u.firstName, u.lastName);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
