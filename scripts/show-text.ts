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
  const files = await prismaAdmin.file.findMany({
    where: { tenantId: "default", isDeleted: false, textContent: { not: null } },
    select: { id: true, originalName: true, title: true, textContent: true },
    take: 5,
  });
  for (const f of files) {
    console.log({ name: f.originalName, title: f.title, text: (f.textContent ?? "").slice(0, 100) });
  }
}

main().finally(async () => {
  await prismaAdmin.$disconnect();
  process.exit(0);
});
