'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { File as FileRecord, FileCategory, Prisma } from "@prisma/client";

const CreateDocumentSchema = z.object({
  employeeId: z.string().min(1),
  fileId: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;

function mapDocumentTypeToCategory(type: string): FileCategory {
  const map: Record<string, FileCategory> = {
    contract: "CONTRACT",
    payslip: "PAYSLIP",
    certificate: "CERTIFICATE",
    avatar: "AVATAR",
    document: "DOCUMENT",
  };
  return map[type.toLowerCase()] || "OTHER";
}

export async function createEmployeeDocument(data: unknown) {
  const { tenantId, session } = await requirePermission("documents:create");
  const validated = CreateDocumentSchema.parse(data);
  const category = mapDocumentTypeToCategory(validated.category);

  return withTenant(tenantId, async (tx) => {
    const file = await tx.file.findUnique({
      where: { id: validated.fileId },
    });

    if (!file || file.tenantId !== tenantId) {
      return { success: false, error: "Datei nicht gefunden" };
    }

    const employee = await tx.employee.findUnique({
      where: { id: validated.employeeId },
    });

    if (!employee || employee.tenantId !== tenantId) {
      return { success: false, error: "Mitarbeiter nicht gefunden" };
    }

    // Mark any existing latest version of this logical document as not latest.
    // We identify the version chain by versionOfId. If this file is brand new,
    // it becomes the root of the chain.
    const versionOfId = file.versionOfId ?? file.id;
    await tx.file.updateMany({
      where: {
        tenantId,
        employeeId: validated.employeeId,
        versionOfId,
        isLatestVersion: true,
      },
      data: { isLatestVersion: false },
    });

    const latestVersion = await tx.file.findFirst({
      where: { tenantId, employeeId: validated.employeeId, versionOfId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (latestVersion?.version ?? 0) + 1;

    const updated = await tx.file.update({
      where: { id: validated.fileId },
      data: {
        employeeId: validated.employeeId,
        title: validated.title,
        category,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        notes: validated.notes ?? null,
        versionOfId,
        version: nextVersion,
        isLatestVersion: true,
      },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "CREATE_EMPLOYEE_DOCUMENT",
      resourceType: "File",
      resourceId: updated.id,
      metadata: { employeeId: validated.employeeId, version: nextVersion },
    });

    revalidatePath(`/dashboard/modules/employees/${validated.employeeId}`);
    return { success: true, document: updated };
  });
}

export async function getEmployeeDocuments(employeeId: string): Promise<
  { success: true; documents: FileRecord[] } | { success: false; error: string }
> {
  const { tenantId } = await requirePermission("documents:read");

  return withTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee || employee.tenantId !== tenantId) {
      return { success: false, error: "Mitarbeiter nicht gefunden" };
    }

    const documents = await tx.file.findMany({
      where: {
        tenantId,
        employeeId,
        isDeleted: false,
        isLatestVersion: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, documents };
  });
}

export async function deleteEmployeeDocument(fileId: string, employeeId: string) {
  const { tenantId, session } = await requirePermission("documents:delete");

  return withTenant(tenantId, async (tx) => {
    const file = await tx.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.tenantId !== tenantId || file.employeeId !== employeeId) {
      return { success: false, error: "Dokument nicht gefunden" };
    }

    await tx.file.update({
      where: { id: fileId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: session.user.id,
      },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "DELETE_EMPLOYEE_DOCUMENT",
      resourceType: "File",
      resourceId: fileId,
      metadata: { employeeId },
    });

    revalidatePath(`/dashboard/modules/employees/${employeeId}`);
    return { success: true };
  });
}

export async function getDocumentVersions(fileId: string): Promise<
  { success: true; versions: FileRecord[] } | { success: false; error: string }
> {
  const { tenantId } = await requirePermission("documents:read");

  return withTenant(tenantId, async (tx) => {
    const file = await tx.file.findUnique({ where: { id: fileId } });
    if (!file || file.tenantId !== tenantId) {
      return { success: false, error: "Dokument nicht gefunden" };
    }

    const versionOfId = file.versionOfId ?? file.id;
    const versions = await tx.file.findMany({
      where: {
        tenantId,
        versionOfId,
        isDeleted: false,
      },
      orderBy: { version: "desc" },
    });

    return { success: true, versions };
  });
}

export async function getAllDocuments(params?: { status?: "all" | "expired" | "expiring" | "valid"; search?: string; limit?: number }) {
  const { tenantId } = await requirePermission("documents:read");

  return withTenant(tenantId, async (tx) => {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const where: Prisma.FileWhereInput = {
      tenantId,
      isDeleted: false,
      isLatestVersion: true,
      employeeId: { not: null },
    };

    if (params?.status === "expired") {
      where.expiresAt = { lt: now };
    } else if (params?.status === "expiring") {
      where.expiresAt = { gte: now, lte: sevenDays };
    } else if (params?.status === "valid") {
      where.OR = [{ expiresAt: null }, { expiresAt: { gt: sevenDays } }];
    }

    if (params?.search) {
      const term = params.search.trim().toLowerCase();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { originalName: { contains: term, mode: "insensitive" } },
        { notes: { contains: term, mode: "insensitive" } },
        { employee: { firstName: { contains: term, mode: "insensitive" } } },
        { employee: { lastName: { contains: term, mode: "insensitive" } } },
      ];
    }

    const documents = await tx.file.findMany({
      where,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
        uploadedBy: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: params?.limit ?? 100,
    });

    return { success: true, documents };
  });
}

export async function snoozeDocument(fileId: string, snoozedUntil: string) {
  const { tenantId, session } = await requirePermission("documents:update");

  return withTenant(tenantId, async (tx) => {
    const file = await tx.file.findUnique({ where: { id: fileId } });
    if (!file || file.tenantId !== tenantId) {
      return { success: false, error: "Dokument nicht gefunden" };
    }

    await tx.file.update({
      where: { id: fileId },
      data: { snoozedUntil: new Date(snoozedUntil) },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "SNOOZE_DOCUMENT",
      resourceType: "File",
      resourceId: fileId,
      metadata: { snoozedUntil },
    });

    return { success: true };
  });
}

export async function getExpiringDocuments(limit = 10) {
  const { tenantId } = await requirePermission("documents:read");

  return withTenant(tenantId, async (tx) => {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const documents = await tx.file.findMany({
      where: {
        tenantId,
        isDeleted: false,
        isLatestVersion: true,
        employeeId: { not: null },
        expiresAt: { not: null, gte: now, lte: sevenDays },
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lt: now } }],
      },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
      },
      orderBy: { expiresAt: "asc" },
      take: limit,
    });

    return { success: true, documents };
  });
}
