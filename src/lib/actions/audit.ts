'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import type { AuditLog, Prisma, User } from "@prisma/client";

export type AuditLogWithUser = AuditLog & {
  user: Pick<User, "id" | "email" | "firstName" | "lastName"> | null;
};

export type AuditLogFilters = {
  action?: string;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  from?: string;
  to?: string;
};

export async function getAuditLogs(
  options: { limit?: number; offset?: number; filters?: AuditLogFilters } = {}
): Promise<{ logs: AuditLogWithUser[]; total: number; hasMore: boolean }> {
  const { tenantId } = await requirePermission("audit:read");
  const { limit = 100, offset = 0, filters = {} } = options;

  return withTenant(tenantId, async (tx) => {
    const where: Prisma.AuditLogWhereInput = { tenantId };

    if (filters.action) {
      if (filters.action.endsWith("*")) {
        const prefix = filters.action.slice(0, -1);
        where.action = { startsWith: prefix };
      } else {
        where.action = filters.action;
      }
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [logs, total] = await Promise.all([
      tx.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      tx.auditLog.count({ where }),
    ]);

    return {
      logs: logs as AuditLogWithUser[],
      total,
      hasMore: offset + logs.length < total,
    };
  });
}

export async function getDistinctAuditActions(): Promise<string[]> {
  const { tenantId } = await requirePermission("audit:read");
  return withTenant(tenantId, async (tx) => {
    const rows = await tx.auditLog.groupBy({
      by: ["action"],
      where: { tenantId },
      orderBy: { action: "asc" },
    });
    return rows.map((r) => r.action);
  });
}

export async function getDistinctAuditResourceTypes(): Promise<string[]> {
  const { tenantId } = await requirePermission("audit:read");
  return withTenant(tenantId, async (tx) => {
    const rows = await tx.auditLog.groupBy({
      by: ["resourceType"],
      where: { tenantId },
      orderBy: { resourceType: "asc" },
    });
    return rows.map((r) => r.resourceType);
  });
}
