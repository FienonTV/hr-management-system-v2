import { prisma } from "../src/lib/db/prisma";

async function testCreate() {
  console.log("Testing raw insert...");
  try {
    await prisma.$executeRaw`INSERT INTO tenants (id, name, slug, externalId, created_at, updated_at) VALUES ('test-1', 'Test Tenant', 'test-slug', 'test-ext', NOW(), NOW())`;
    console.log("Raw insert success!");
  } catch (e) {
    console.error("Raw insert failed:", e);
  }
}

testCreate();
