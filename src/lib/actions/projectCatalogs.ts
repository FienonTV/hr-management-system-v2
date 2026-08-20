'use server';

import { withTenant } from "@/lib/db/tenant";
import { requireAnyPermission } from "@/lib/permissions";
import type { CustomFieldDefinition } from "@prisma/client";

export async function getProjectCustomFieldDefinitions(): Promise<CustomFieldDefinition[]> {
  const { tenantId } = await requireAnyPermission("projects:read", "projectLayout:read", "projectLayout:update");
  return withTenant(tenantId, async (tx) => {
    return tx.customFieldDefinition.findMany({
      where: { tenantId, appliesTo: "project", isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  });
}
