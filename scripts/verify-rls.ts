import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { prisma } from "../src/lib/db/prisma";
import { withTenant } from "../src/lib/db/tenant";

async function verifyRLS() {
  console.log("Starting RLS Verification as DB user: hrms_app...");

  try {
    // Verify DB user is hrms_app (not superuser)
    const dbUser = await prisma.$queryRaw`SELECT current_user as user, current_database() as db`;
    console.log(`Connected as: ${(dbUser as any)[0].user}`);

    // 1. Setup: Create two tenants
    const tenantA = await prisma.tenant.create({
      data: { name: "Tenant A", slug: `tenant-a-${Date.now()}`, externalId: `A123-${Date.now()}` },
    });
    const tenantB = await prisma.tenant.create({
      data: { name: "Tenant B", slug: `tenant-b-${Date.now()}`, externalId: `B456-${Date.now()}` },
    });

    // Create employees within tenant context (RLS INSERT policy requires tenant)
    const empA = await withTenant(tenantA.id, async (tx) => {
      return await tx.employee.create({
        data: { firstName: "Alice", lastName: "A", email: `alice-${Date.now()}@tenant-a.com`, tenantId: tenantA.id },
      });
    });

    const empB = await withTenant(tenantB.id, async (tx) => {
      return await tx.employee.create({
        data: { firstName: "Bob", lastName: "B", email: `bob-${Date.now()}@tenant-b.com`, tenantId: tenantB.id },
      });
    });

    console.log("Setup complete. Testing isolation...");

    // Test 1: Tenant A can see their own employee
    const resultA = await withTenant(tenantA.id, async (tx) => {
      return await tx.employee.findMany();
    });
    console.log(`Tenant A sees ${resultA.length} employees (Expected: 1)`);
    if (resultA.length !== 1 || resultA[0].id !== empA.id) {
      throw new Error("Tenant A failed to see their own data correctly");
    }

    // Test 2: Tenant B can only see their own employee
    const resultB = await withTenant(tenantB.id, async (tx) => {
      return await tx.employee.findMany();
    });
    console.log(`Tenant B sees ${resultB.length} employees (Expected: 1)`);
    if (resultB.length !== 1 || resultB[0].id !== empB.id) {
      throw new Error("Tenant B sees data they shouldn't see");
    }

    // Test 3: Cross-Tenant Leakage (Tenant A tries to find Employee B)
    const leak = await withTenant(tenantA.id, async (tx) => {
      return await tx.employee.findUnique({ where: { id: empB.id } });
    });
    console.log(`Tenant A trying to find Employee B: ${leak ? "FOUND (LEAK!)" : "NOT FOUND (Correct)"}`);
    if (leak) throw new Error("Cross-tenant leakage detected!");

    // Test 4: Unprotected Access (No withTenant) - as hrms_app this should see 0 rows
    const unprotected = await prisma.employee.findMany();
    console.log(`Unprotected access sees ${unprotected.length} employees (Expected: 0 as hrms_app)`);
    if (unprotected.length !== 0) {
      throw new Error("Unprotected access should not see any rows as hrms_app");
    }

    // Test 5: Audit Log Immutability
    const audit = await withTenant(tenantA.id, async (tx) => {
      const log = await tx.auditLog.create({
        data: { tenantId: tenantA.id, action: "test", resourceType: "test" }
      });
      try {
        await tx.auditLog.update({
          where: { id: log.id },
          data: { action: "hacked" }
        });
        return "updated";
      } catch {
        return "failed";
      }
    });
    console.log(`Audit log update result: ${audit} (Expected: failed)`);
    if (audit === "updated") {
      throw new Error("Audit log is not immutable!");
    }

    // Cleanup: remove test tenants (cascades to employees and audit logs)
    await prisma.tenant.delete({ where: { id: tenantA.id } }).catch(() => null);
    await prisma.tenant.delete({ where: { id: tenantB.id } }).catch(() => null);

    console.log("RLS Verification PASSED successfully!");
  } catch (error) {
    console.error("RLS Verification FAILED:");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyRLS();
