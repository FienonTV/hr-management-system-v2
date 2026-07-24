'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import type { AuditLog } from "@prisma/client";

export async function getAuditLogs(limit = 100): Promise<AuditLog[]> {
  const { tenantId } = await requirePermission("audit:read");

  return withTenant(tenantId, async (tx) => {
    return tx.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  });
}
