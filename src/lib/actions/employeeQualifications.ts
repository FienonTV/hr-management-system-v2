'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { uploadFile } from "@/lib/actions/files";
import type { EmployeeQualification, Qualification } from "@prisma/client";

export type EmployeeQualificationRecord = EmployeeQualification & {
  qualification: Qualification;
};

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function parseDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function getEmployeeQualifications(
  employeeId: string
): Promise<EmployeeQualificationRecord[]> {
  const { tenantId } = await requirePermission("employees:read");
  return withTenant(tenantId, async (tx) => {
    return tx.employeeQualification.findMany({
      where: { tenantId, employeeId },
      include: { qualification: true },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function createEmployeeQualification(
  employeeId: string,
  data: {
    qualificationId: string;
    issuedAt?: string | Date | null;
    expiresAt?: string | Date | null;
    notes?: string;
    certificateFile?: File;
  }
): Promise<
  | { success: true; record: EmployeeQualificationRecord }
  | { success: false; error: string }
> {
  const { tenantId, session } = await requirePermission("employees:update");
  const { qualificationId, issuedAt, expiresAt, notes, certificateFile } = data;

  const qualification = await withTenant(tenantId, async (tx) =>
    tx.qualification.findUnique({ where: { id: qualificationId, tenantId } })
  );
  if (!qualification) {
    return { success: false, error: "Qualifikation nicht gefunden" };
  }

  const parsedIssuedAt = parseDate(issuedAt);
  let parsedExpiresAt = parseDate(expiresAt);
  if (!parsedExpiresAt && parsedIssuedAt && qualification.validityInMonths) {
    parsedExpiresAt = addMonths(parsedIssuedAt, qualification.validityInMonths);
  }

  let certificateFileId: string | undefined;
  if (certificateFile && certificateFile.size > 0) {
    const uploadResult = await uploadFile(certificateFile, {
      employeeId,
      category: "CERTIFICATE",
      title: `Zertifikat ${qualification.name}`,
    });
    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error || "Zertifikat-Upload fehlgeschlagen" };
    }
    if (!uploadResult.fileId) {
      return { success: false, error: "Zertifikat-Upload fehlgeschlagen" };
    }
    certificateFileId = uploadResult.fileId;
  }

  return withTenant(tenantId, async (tx) => {
    const record = await tx.employeeQualification.create({
      data: {
        tenantId,
        employeeId,
        qualificationId,
        issuedAt: parsedIssuedAt,
        expiresAt: parsedExpiresAt,
        certificateFileId,
        notes: notes ?? null,
      },
      include: { qualification: true },
    });

    revalidatePath(`/dashboard/modules/employees/${employeeId}`);
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "employeeQualification.create",
      resourceType: "employeeQualification",
      resourceId: record.id,
      metadata: { employeeId, qualificationId, qualificationName: qualification.name },
    });

    return { success: true, record };
  });
}

export async function updateEmployeeQualification(
  id: string,
  data: {
    qualificationId?: string;
    issuedAt?: string | Date | null;
    expiresAt?: string | Date | null;
    notes?: string;
    certificateFile?: File;
  }
): Promise<
  | { success: true; record: EmployeeQualificationRecord }
  | { success: false; error: string }
> {
  const { tenantId, session } = await requirePermission("employees:update");
  const { qualificationId, issuedAt, expiresAt, notes, certificateFile } = data;

  const existing = await withTenant(tenantId, async (tx) =>
    tx.employeeQualification.findUnique({
      where: { id },
      include: { qualification: true },
    })
  );
  if (!existing || existing.tenantId !== tenantId) {
    return { success: false, error: "Mitarbeiter-Qualifikation nicht gefunden" };
  }

  const targetQualificationId = qualificationId || existing.qualificationId;
  const qualification = await withTenant(tenantId, async (tx) =>
    tx.qualification.findUnique({ where: { id: targetQualificationId, tenantId } })
  );
  if (!qualification) {
    return { success: false, error: "Qualifikation nicht gefunden" };
  }

  const parsedIssuedAt = parseDate(issuedAt) ?? existing.issuedAt;
  let parsedExpiresAt = parseDate(expiresAt);
  if (!parsedExpiresAt && parsedIssuedAt && qualification.validityInMonths) {
    parsedExpiresAt = addMonths(parsedIssuedAt, qualification.validityInMonths);
  }

  let certificateFileId = existing.certificateFileId;
  if (certificateFile && certificateFile.size > 0) {
    const uploadResult = await uploadFile(certificateFile, {
      employeeId: existing.employeeId,
      category: "CERTIFICATE",
      title: `Zertifikat ${qualification.name}`,
    });
    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error || "Zertifikat-Upload fehlgeschlagen" };
    }
    if (!uploadResult.fileId) {
      return { success: false, error: "Zertifikat-Upload fehlgeschlagen" };
    }
    certificateFileId = uploadResult.fileId;
  }

  return withTenant(tenantId, async (tx) => {
    const record = await tx.employeeQualification.update({
      where: { id },
      data: {
        qualificationId: targetQualificationId,
        issuedAt: parsedIssuedAt,
        expiresAt: parsedExpiresAt,
        certificateFileId,
        notes: notes !== undefined ? (notes ?? null) : existing.notes,
      },
      include: { qualification: true },
    });

    revalidatePath(`/dashboard/modules/employees/${existing.employeeId}`);
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "employeeQualification.update",
      resourceType: "employeeQualification",
      resourceId: id,
      metadata: { employeeId: existing.employeeId, qualificationId: targetQualificationId, qualificationName: qualification.name },
    });

    return { success: true, record };
  });
}

export async function deleteEmployeeQualification(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("employees:update");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.employeeQualification.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      return { success: false, error: "Mitarbeiter-Qualifikation nicht gefunden" };
    }

    await tx.employeeQualification.delete({ where: { id } });

    revalidatePath(`/dashboard/modules/employees/${existing.employeeId}`);
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "employeeQualification.delete",
      resourceType: "employeeQualification",
      resourceId: id,
      metadata: { employeeId: existing.employeeId, qualificationId: existing.qualificationId },
    });

    return { success: true };
  });
}

export async function getExpiringQualifications(days = 90) {
  const { tenantId } = await requirePermission("employees:read");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  return withTenant(tenantId, async (tx) => {
    return tx.employeeQualification.findMany({
      where: {
        tenantId,
        expiresAt: { lte: cutoff },
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } }, qualification: true },
      orderBy: { expiresAt: "asc" },
    });
  });
}
