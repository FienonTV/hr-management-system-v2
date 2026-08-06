import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma } from "@prisma/client";

function createPrismaClient(connectionString: string): PrismaClient {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prismaAdmin = createPrismaClient(process.env.DIRECT_URL!);

async function main() {
  const tenantId = "default";
  const rawQuery = "Muster";
  const terms = rawQuery.trim().replace(/[%,_*?]/g, " ").split(/\s+/).filter(Boolean);
  const patterns = terms.map((t) => `%${t}%`);
  const fragments = patterns.flatMap((pattern) => [
    Prisma.sql`"original_name" ILIKE ${pattern}`,
    Prisma.sql`"title" ILIKE ${pattern}`,
    Prisma.sql`"text_content" ILIKE ${pattern}`,
  ]);
  const searchClause = Prisma.sql`(${Prisma.join(fragments, " OR ")})`;
  const query = Prisma.sql`
    SELECT * FROM "files"
    WHERE "tenant_id" = ${tenantId}
      AND "is_deleted" = false
      AND ${searchClause}
    ORDER BY "created_at" DESC
    LIMIT 50
  `;
  const files = await (prismaAdmin as any).$queryRaw(query);
  console.log("results:", files.length);
}

main().finally(async () => {
  await prismaAdmin.$disconnect();
  process.exit(0);
});
