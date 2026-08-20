'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission, requireAnyPermission } from "@/lib/permissions";
import type { CustomFieldDefinition, CustomFieldType } from "@prisma/client";

export async function getProjectCustomFieldDefinitions(): Promise<CustomFieldDefinition[]> {
  const { tenantId } = await requireAnyPermission(
    "projects:read",
    "projectLayout:read",
    "projectLayout:update",
    "projectCustomFields:read",
    "projectCustomFields:update"
  );
  return withTenant(tenantId, async (tx) => {
    return tx.customFieldDefinition.findMany({
      where: { tenantId, appliesTo: "project", isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  });
}

export async function createProjectCustomFieldDefinition(data: {
  key: string;
  name: string;
  fieldType: CustomFieldType;
  options?: { values?: string[] } | null;
  isRequired?: boolean;
}): Promise<{ success: true; definition: CustomFieldDefinition } | { success: false; error: string }> {
  const { tenantId } = await requirePermission("projectCustomFields:update");

  if (!data.key?.trim() || !data.name?.trim()) {
    return { success: false, error: "Key und Name sind erforderlich" };
  }

  const key = data.key.trim();
  if (!/^[a-zA-Z0-9_]+$/.test(key)) {
    return { success: false, error: "Key darf nur Buchstaben, Zahlen und Unterstriche enthalten" };
  }

  return withTenant(tenantId, async (tx) => {
    const existing = await tx.customFieldDefinition.findFirst({
      where: { tenantId, appliesTo: "project", key },
    });
    if (existing) {
      return { success: false, error: "Ein Feld mit diesem Key existiert bereits" };
    }

    const count = await tx.customFieldDefinition.count({
      where: { tenantId, appliesTo: "project", isActive: true },
    });

    const def = await tx.customFieldDefinition.create({
      data: {
        tenantId,
        appliesTo: "project",
        key,
        name: data.name.trim(),
        fieldType: data.fieldType,
        options: data.options as any,
        isRequired: data.isRequired ?? false,
        sortOrder: count,
        isActive: true,
      },
    });
    return { success: true, definition: def };
  });
}

export async function updateProjectCustomFieldDefinition(
  id: string,
  data: {
    name?: string;
    options?: { values?: string[] } | null;
    isRequired?: boolean;
    isActive?: boolean;
    sortOrder?: number;
  }
): Promise<{ success: true; definition: CustomFieldDefinition } | { success: false; error: string }> {
  const { tenantId } = await requirePermission("projectCustomFields:update");

  return withTenant(tenantId, async (tx) => {
    const existing = await tx.customFieldDefinition.findFirst({
      where: { id, tenantId, appliesTo: "project" },
    });
    if (!existing) {
      return { success: false, error: "Feld nicht gefunden" };
    }

    const def = await tx.customFieldDefinition.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        options: data.options as any,
        isRequired: data.isRequired,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });
    return { success: true, definition: def };
  });
}

export async function deleteProjectCustomFieldDefinition(id: string): Promise<{ success: true } | { success: false; error: string }> {
  const { tenantId } = await requirePermission("projectCustomFields:update");

  return withTenant(tenantId, async (tx) => {
    const existing = await tx.customFieldDefinition.findFirst({
      where: { id, tenantId, appliesTo: "project" },
    });
    if (!existing) {
      return { success: false, error: "Feld nicht gefunden" };
    }

    await tx.customFieldDefinition.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true };
  });
}
