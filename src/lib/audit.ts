import { withTenant } from "./db/tenant";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.login_failed"
  | "auth.password_reset"
  | "permissions.change"
  | "tenant.activate"
  | "tenant.deactivate"
  | "file.upload"
  | "file.download"
  | "employee.create"
  | "employee.update"
  | "employee.delete"
  | "role.create"
  | "role.update"
  | "role.delete"
  | "user.role.assign"
  | "user.role.remove"
  | "user.create"
  | "user.delete";

interface LogAuditParams {
  tenantId: string;
  userId?: string;
  action: AuditAction | string;
  resourceType: string;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Logs a security-relevant event to the AuditLog table.
 * Uses withTenant to ensure the log entry is associated with the correct tenant.
 */
export async function logAudit({
  tenantId,
  userId,
  action,
  resourceType,
  resourceId,
  metadata,
}: LogAuditParams) {
  const headerList = await headers();
  const userAgent = headerList.get("user-agent") || "unknown";
  const ipAddress = headerList.get("x-forwarded-for") || "unknown";

  return withTenant(tenantId, async (tx) => {
    return tx.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        resourceType,
        resourceId,
        metadata,
        ipAddress,
        userAgent,
      },
    });
  });
}
