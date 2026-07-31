import { withTenant } from "./db/tenant";
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
  | "file.delete"
  | "file.view"
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

export type FileAccessType = "upload" | "download" | "delete" | "view";

interface LogFileAccessParams {
  tenantId: string;
  userId?: string;
  accessType: FileAccessType;
  fileId: string;
  fileName: string;
  storageKey: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Logs a file access event (upload, download, view, delete) to the AuditLog.
 * This is a thin wrapper around logAudit with consistent resourceType/resourceId conventions.
 */
export async function logFileAccess({
  tenantId,
  userId,
  accessType,
  fileId,
  fileName,
  storageKey,
  metadata,
}: LogFileAccessParams) {
  const actionMap: Record<FileAccessType, AuditAction> = {
    upload: "file.upload",
    download: "file.download",
    view: "file.view",
    delete: "file.delete",
  };

  return logAudit({
    tenantId,
    userId,
    action: actionMap[accessType],
    resourceType: "file",
    resourceId: fileId,
    metadata: {
      fileName,
      storageKey,
      accessType,
      ...(typeof metadata === "object" && metadata !== null ? metadata : {}),
    },
  });
}

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
  let userAgent = "unknown";
  let ipAddress = "unknown";
  try {
    const { headers } = await import("next/headers");
    const headerList = await headers();
    userAgent = headerList.get("user-agent") || "unknown";
    ipAddress = headerList.get("x-forwarded-for") || "unknown";
  } catch {
    // next/headers is unavailable on the client / pages dir; fall back to defaults.
  }

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
