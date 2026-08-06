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
  const remaining = await prismaAdmin.file.count({
    where: {
      textContent: null,
      isDeleted: false,
      mimeType: {
        in: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ],
      },
    },
  });
  const indexed = await prismaAdmin.file.count({
    where: {
      textContent: { not: null },
      isDeleted: false,
    },
  });
  console.log({ remaining, indexed });
}

main().finally(async () => {
  await prismaAdmin.$disconnect();
  process.exit(0);
});
