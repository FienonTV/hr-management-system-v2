'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission, requireAnyPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import type { Qualification } from "@prisma/client";

export async function getQualifications(): Promise<Qualification[]> {
  const { tenantId } = await requireAnyPermission("employees:read", "employees:read:all", "employees:read:own");
  return withTenant(tenantId, async (tx) => {
    return tx.qualification.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
    });
  });
}

export async function getAllQualifications(): Promise<Qualification[]> {
  const { tenantId } = await requirePermission("qualifications:manage");
  return withTenant(tenantId, async (tx) => {
    return tx.qualification.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  });
}

export async function createQualification(data: {
  name: string;
  issuer?: string;
  description?: string;
  validityInMonths?: number | null;
}): Promise<{ success: true; qualification: Qualification } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("qualifications:manage");
  return withTenant(tenantId, async (tx) => {
    const qualification = await tx.qualification.create({
      data: { ...data, tenantId, isActive: true },
    });
    revalidatePath("/dashboard/modules/admin/qualifications");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "qualification.create",
      resourceType: "qualification",
      resourceId: qualification.id,
      metadata: { name: qualification.name },
    });
    return { success: true, qualification };
  });
}

export async function updateQualification(
  id: string,
  data: {
    name?: string;
    issuer?: string;
    description?: string;
    validityInMonths?: number | null;
    isActive?: boolean;
  }
): Promise<{ success: true; qualification: Qualification } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("qualifications:manage");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.qualification.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      return { success: false, error: "Qualifikation nicht gefunden" };
    }
    const qualification = await tx.qualification.update({ where: { id }, data });
    revalidatePath("/dashboard/modules/admin/qualifications");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "qualification.update",
      resourceType: "qualification",
      resourceId: id,
      metadata: { name: qualification.name },
    });
    return { success: true, qualification };
  });
}

export async function deleteQualification(id: string): Promise<{ success: true } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("qualifications:manage");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.qualification.findUnique({
      where: { id },
      include: { _count: { select: { employeeQualifications: true } } },
    });
    if (!existing || existing.tenantId !== tenantId) {
      return { success: false, error: "Qualifikation nicht gefunden" };
    }
    if ((existing._count?.employeeQualifications ?? 0) > 0) {
      return { success: false, error: "Qualifikation ist noch Mitarbeitern zugeordnet" };
    }
    await tx.qualification.delete({ where: { id } });
    revalidatePath("/dashboard/modules/admin/qualifications");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "qualification.delete",
      resourceType: "qualification",
      resourceId: id,
      metadata: { name: existing.name },
    });
    return { success: true };
  });
}
