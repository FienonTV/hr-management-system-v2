'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import type { Department, Position, PayGrade, CustomFieldDefinition, CustomFieldType } from "@prisma/client";

// ----------------------------- Departments ------------------------------

export async function getDepartments() {
  const { tenantId } = await requirePermission("employees:read");
  return withTenant(tenantId, async (tx) => {
    return tx.department.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
    });
  });
}

export async function getAllDepartments() {
  const { tenantId } = await requirePermission("departments:manage");
  return withTenant(tenantId, async (tx) => {
    return tx.department.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  });
}

export async function createDepartment(data: { name: string; code?: string; description?: string }) {
  const { tenantId, session } = await requirePermission("departments:manage");
  return withTenant(tenantId, async (tx) => {
    const department = await tx.department.create({
      data: { ...data, tenantId, isActive: true },
    });
    revalidatePath("/dashboard/modules/admin/departments");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "department.create",
      resourceType: "department",
      resourceId: department.id,
      metadata: { name: department.name },
    });
    return { success: true, department };
  });
}

export async function updateDepartment(id: string, data: { name?: string; code?: string; description?: string; isActive?: boolean }) {
  const { tenantId, session } = await requirePermission("departments:manage");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.department.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) return { success: false, error: "Abteilung nicht gefunden" };
    const department = await tx.department.update({ where: { id }, data });
    revalidatePath("/dashboard/modules/admin/departments");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "department.update",
      resourceType: "department",
      resourceId: id,
      metadata: { name: department.name },
    });
    return { success: true, department };
  });
}

export async function deleteDepartment(id: string) {
  const { tenantId, session } = await requirePermission("departments:manage");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.department.findUnique({ where: { id }, include: { _count: { select: { employees: true } } } });
    if (!existing || existing.tenantId !== tenantId) return { success: false, error: "Abteilung nicht gefunden" };
    if ((existing._count?.employees ?? 0) > 0) {
      return { success: false, error: "Abteilung ist noch Mitarbeitern zugeordnet" };
    }
    await tx.department.delete({ where: { id } });
    revalidatePath("/dashboard/modules/admin/departments");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "department.delete",
      resourceType: "department",
      resourceId: id,
      metadata: { name: existing.name },
    });
    return { success: true };
  });
}

// ----------------------------- Positions --------------------------------

export async function getPositions() {
  const { tenantId } = await requirePermission("employees:read");
  return withTenant(tenantId, async (tx) => {
    return tx.position.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
    });
  });
}

export async function getAllPositions() {
  const { tenantId } = await requirePermission("positions:manage");
  return withTenant(tenantId, async (tx) => {
    return tx.position.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  });
}

export async function createPosition(data: { name: string; code?: string; description?: string }) {
  const { tenantId, session } = await requirePermission("positions:manage");
  return withTenant(tenantId, async (tx) => {
    const position = await tx.position.create({
      data: { ...data, tenantId, isActive: true },
    });
    revalidatePath("/dashboard/modules/admin/positions");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "position.create",
      resourceType: "position",
      resourceId: position.id,
      metadata: { name: position.name },
    });
    return { success: true, position };
  });
}

export async function updatePosition(id: string, data: { name?: string; code?: string; description?: string; isActive?: boolean }) {
  const { tenantId, session } = await requirePermission("positions:manage");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.position.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) return { success: false, error: "Position nicht gefunden" };
    const position = await tx.position.update({ where: { id }, data });
    revalidatePath("/dashboard/modules/admin/positions");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "position.update",
      resourceType: "position",
      resourceId: id,
      metadata: { name: position.name },
    });
    return { success: true, position };
  });
}

export async function deletePosition(id: string) {
  const { tenantId, session } = await requirePermission("positions:manage");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.position.findUnique({ where: { id }, include: { _count: { select: { employees: true } } } });
    if (!existing || existing.tenantId !== tenantId) return { success: false, error: "Position nicht gefunden" };
    if ((existing._count?.employees ?? 0) > 0) {
      return { success: false, error: "Position ist noch Mitarbeitern zugeordnet" };
    }
    await tx.position.delete({ where: { id } });
    revalidatePath("/dashboard/modules/admin/positions");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "position.delete",
      resourceType: "position",
      resourceId: id,
      metadata: { name: existing.name },
    });
    return { success: true };
  });
}

// ----------------------------- Pay Grades -------------------------------

export async function getPayGrades() {
  const { tenantId } = await requirePermission("employees:read");
  return withTenant(tenantId, async (tx) => {
    return tx.payGrade.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
    });
  });
}

export async function getAllPayGrades() {
  const { tenantId } = await requirePermission("payGrades:manage");
  return withTenant(tenantId, async (tx) => {
    return tx.payGrade.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  });
}

export async function createPayGrade(data: { name: string; code?: string; description?: string; tariffGroup?: string }) {
  const { tenantId, session } = await requirePermission("payGrades:manage");
  return withTenant(tenantId, async (tx) => {
    const payGrade = await tx.payGrade.create({
      data: { ...data, tenantId, isActive: true },
    });
    revalidatePath("/dashboard/modules/admin/pay-grades");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "payGrade.create",
      resourceType: "payGrade",
      resourceId: payGrade.id,
      metadata: { name: payGrade.name },
    });
    return { success: true, payGrade };
  });
}

export async function updatePayGrade(id: string, data: { name?: string; code?: string; description?: string; tariffGroup?: string; isActive?: boolean }) {
  const { tenantId, session } = await requirePermission("payGrades:manage");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.payGrade.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) return { success: false, error: "Entgeltgruppe nicht gefunden" };
    const payGrade = await tx.payGrade.update({ where: { id }, data });
    revalidatePath("/dashboard/modules/admin/pay-grades");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "payGrade.update",
      resourceType: "payGrade",
      resourceId: id,
      metadata: { name: payGrade.name },
    });
    return { success: true, payGrade };
  });
}

export async function deletePayGrade(id: string) {
  const { tenantId, session } = await requirePermission("payGrades:manage");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.payGrade.findUnique({ where: { id }, include: { _count: { select: { employees: true } } } });
    if (!existing || existing.tenantId !== tenantId) return { success: false, error: "Entgeltgruppe nicht gefunden" };
    if ((existing._count?.employees ?? 0) > 0) {
      return { success: false, error: "Entgeltgruppe ist noch Mitarbeitern zugeordnet" };
    }
    await tx.payGrade.delete({ where: { id } });
    revalidatePath("/dashboard/modules/admin/pay-grades");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "payGrade.delete",
      resourceType: "payGrade",
      resourceId: id,
      metadata: { name: existing.name },
    });
    return { success: true };
  });
}

// ----------------------------- Custom Field Definitions -----------------

const CUSTOM_FIELD_TYPES: CustomFieldType[] = ["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT", "MULTI_SELECT"];

export async function getCustomFieldDefinitions(appliesTo: string = "employee") {
  const { tenantId } = await requirePermission("employees:read");
  return withTenant(tenantId, async (tx) => {
    return tx.customFieldDefinition.findMany({
      where: { tenantId, appliesTo, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  });
}

export async function getAllCustomFieldDefinitions(appliesTo: string = "employee") {
  const { tenantId } = await requirePermission("customFields:manage");
  return withTenant(tenantId, async (tx) => {
    return tx.customFieldDefinition.findMany({
      where: { tenantId, appliesTo },
      orderBy: { sortOrder: "asc" },
    });
  });
}

export async function createCustomFieldDefinition(data: {
  appliesTo: string;
  key: string;
  name: string;
  description?: string;
  fieldType: CustomFieldType;
  isRequired?: boolean;
  options?: { values: string[] };
  sortOrder?: number;
}) {
  const { tenantId, session } = await requirePermission("customFields:manage");
  if (!CUSTOM_FIELD_TYPES.includes(data.fieldType)) {
    return { success: false, error: "Ungültiger Feldtyp" };
  }
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.customFieldDefinition.findUnique({
      where: { tenantId_appliesTo_key: { tenantId, appliesTo: data.appliesTo, key: data.key } },
    });
    if (existing) {
      return { success: false, error: "Ein Feld mit diesem Key existiert bereits" };
    }
    const def = await tx.customFieldDefinition.create({
      data: { ...data, tenantId, isActive: true },
    });
    revalidatePath("/dashboard/modules/admin/custom-fields");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "customFieldDefinition.create",
      resourceType: "customFieldDefinition",
      resourceId: def.id,
      metadata: { key: def.key, name: def.name },
    });
    return { success: true, def };
  });
}

export async function updateCustomFieldDefinition(
  id: string,
  data: {
    name?: string;
    description?: string;
    isRequired?: boolean;
    options?: { values: string[] };
    sortOrder?: number;
    isActive?: boolean;
  }
) {
  const { tenantId, session } = await requirePermission("customFields:manage");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.customFieldDefinition.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) return { success: false, error: "Felddefinition nicht gefunden" };
    const def = await tx.customFieldDefinition.update({ where: { id }, data });
    revalidatePath("/dashboard/modules/admin/custom-fields");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "customFieldDefinition.update",
      resourceType: "customFieldDefinition",
      resourceId: id,
      metadata: { key: def.key, name: def.name },
    });
    return { success: true, def };
  });
}

export async function deleteCustomFieldDefinition(id: string) {
  const { tenantId, session } = await requirePermission("customFields:manage");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.customFieldDefinition.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) return { success: false, error: "Felddefinition nicht gefunden" };
    await tx.customFieldDefinition.delete({ where: { id } });
    revalidatePath("/dashboard/modules/admin/custom-fields");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "customFieldDefinition.delete",
      resourceType: "customFieldDefinition",
      resourceId: id,
      metadata: { key: existing.key, name: existing.name },
    });
    return { success: true };
  });
}
