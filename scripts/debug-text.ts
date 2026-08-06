import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient(connectionString: string): PrismaClient {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prismaAdmin = createPrismaClient(process.env.DIRECT_URL!);

async function main() {
  const tenants = await prismaAdmin.tenant.findMany({ select: { id: true, externalId: true } });
  console.log("tenants:", tenants);
  const textFiles = await prismaAdmin.file.findMany({
    where: { textContent: { not: null }, isDeleted: false },
    select: { id: true, tenantId: true, originalName: true, title: true, textContent: true },
    take: 10,
  });
  for (const f of textFiles) {
    console.log({ tenantId: f.tenantId, name: f.originalName, title: f.title, text: (f.textContent ?? "").slice(0, 100) });
  }
}

main().finally(async () => {
  await prismaAdmin.$disconnect();
  process.exit(0);
});
