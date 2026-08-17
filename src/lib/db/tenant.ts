import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

/**
 * Wraps a database operation within a transaction and sets the
 * PostgreSQL local variable `app.current_tenant` for Row-Level Security (RLS).
 *
 * @param tenantId The ID of the tenant to set as the current context.
 * @param operation A callback function that receives the transaction client.
 * @returns The result of the operation.
 * @throws Error if the tenantId is missing.
 */
export async function withTenant<T>(
  tenantId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  if (!tenantId) {
    throw new Error("Tenant ID is required for RLS context");
  }

  return prisma.$transaction(async (tx) => {
    // Set the tenant context for the current transaction.
    // $executeRawUnsafe is used because `SET LOCAL` cannot be executed as a prepared statement.
    const escapedTenantId = tenantId.replace(/'/g, "''");
    await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant = '${escapedTenantId}'`);
    await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${escapedTenantId}'`);

    return operation(tx);
  });
}
