'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { prismaAdmin } from "@/lib/db/prisma";

export async function getDocumentCategories(includeInactive = false) {
  const { tenantId, session } = await requirePermission("documents:read");

  const categories = await prismaAdmin.documentCategory.findMany({
    where: {
      tenantId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: { name: "asc" },
  });

  return { success: true, categories };
}

export async function createDocumentCategory(input: {
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}) {
  const { tenantId, session } = await requirePermission("documentCategories:manage");
  const userId = session.user.id;

  const category = await withTenant(tenantId, async (tx) => {
    return tx.documentCategory.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description || null,
        color: input.color || "#3B82F6",
        isActive: input.isActive ?? true,
      },
    });
  });

  await logAudit({
    tenantId,
    userId,
    action: "documentCategory.create",
    resourceType: "documentCategory",
    resourceId: category.id,
    metadata: { name: category.name, color: category.color },
  });

  revalidatePath("/dashboard/modules/admin/document-categories");
  revalidatePath("/dashboard/modules/employees/[id]", "page");
  return { success: true, category };
}

export async function updateDocumentCategory(
  id: string,
  input: {
    name: string;
    description?: string;
    color?: string;
    isActive?: boolean;
  }
) {
  const { tenantId, session } = await requirePermission("documentCategories:manage");
  const userId = session.user.id;

  const existing = await prismaAdmin.documentCategory.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return { success: false, error: "Kategorie nicht gefunden" };
  }

  const category = await withTenant(tenantId, async (tx) => {
    return tx.documentCategory.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description || null,
        color: input.color || "#3B82F6",
        isActive: input.isActive ?? existing.isActive,
      },
    });
  });

  await logAudit({
    tenantId,
    userId,
    action: "documentCategory.update",
    resourceType: "documentCategory",
    resourceId: category.id,
    metadata: { name: category.name, isActive: category.isActive },
  });

  revalidatePath("/dashboard/modules/admin/document-categories");
  revalidatePath("/dashboard/modules/employees/[id]", "page");
  return { success: true, category };
}

export async function deleteDocumentCategory(id: string) {
  const { tenantId, session } = await requirePermission("documentCategories:manage");
  const userId = session.user.id;

  const existing = await prismaAdmin.documentCategory.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return { success: false, error: "Kategorie nicht gefunden" };
  }

  // Soft-delete via inactivate to preserve existing associations.
  await withTenant(tenantId, async (tx) => {
    return tx.documentCategory.update({
      where: { id },
      data: { isActive: false },
    });
  });

  await logAudit({
    tenantId,
    userId,
    action: "documentCategory.delete",
    resourceType: "documentCategory",
    resourceId: id,
    metadata: { name: existing.name },
  });

  revalidatePath("/dashboard/modules/admin/document-categories");
  revalidatePath("/dashboard/modules/employees/[id]", "page");
  return { success: true };
}
