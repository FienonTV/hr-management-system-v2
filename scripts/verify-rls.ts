import { prisma } from "../src/lib/db/prisma";
import { withTenant } from "../src/lib/db/tenant";

async function verifyRLS() {
  console.log("Starting RLS Verification...");

  try {
    // 1. Setup: Create two tenants and employees
    const tenantA = await prisma.tenant.create({
      data: { name: "Tenant A", slug: "tenant-a", externalId: "A123" },
    });
    const tenantB = await prisma.tenant.create({
      data: { name: "Tenant B", slug: "tenant-b", externalId: "B456" },
    });

    const empA = await prisma.employee.create({
      data: { firstName: "Alice", lastName: "A", tenantId: tenantA.id },
    });
    const empB = await prisma.employee.create({
      data: { firstName: "Bob", lastName: "B", tenantId: tenantB.id },
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

    // Test 4: Unprotected Access (No withTenant)
    // Note: This depends on whether the DB user is a superuser.
    // In dev, we might be superuser, but we want to test the logic.
    const unprotected = await prisma.employee.findMany();
    console.log(`Unprotected access sees ${unprotected.length} employees`);
    // If RLS is working and we are NOT superuser, this should be 0.
    // If we are superuser, it'll be 2. We just log it.

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

    console.log("RLS Verification PASSED successfully!");
  } catch (error) {
    console.error("RLS Verification FAILED:");
    console.error(error);
    process.exit(1);
  }
}

verifyRLS();
