'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PrismaClient, File, DocumentContainer } from "@prisma/client";
import { Prisma } from "@prisma/client";

const CreateDocumentSchema = z.object({
  employeeId: z.string().min(1),
  fileId: z.string().min(1),
  documentType: z.string().min(1),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;

export async function createEmployeeDocument(data: unknown) {
  const { tenantId, session } = await requirePermission("documents:create");
  const validated = CreateDocumentSchema.parse(data);

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

    // Mark previous version (if any) as not latest via the file's own version chain
    const container = await tx.documentContainer.create({
      data: {
        tenantId,
        employeeId: validated.employeeId,
        title: validated.documentType,
        description: file.originalName,
        validFrom: validated.validFrom ? new Date(validated.validFrom) : null,
        expiresAt: validated.validUntil ? new Date(validated.validUntil) : null,
        notes: validated.notes ?? null,
        uploadedById: session.user.id,
      },
    });

    await tx.file.update({
      where: { id: validated.fileId },
      data: {
        employeeId: validated.employeeId,
        documentContainerId: container.id,
        category: mapDocumentTypeToFileCategory(validated.documentType),
      },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "CREATE_EMPLOYEE_DOCUMENT",
      resourceType: "DocumentContainer",
      resourceId: container.id,
      metadata: { employeeId: validated.employeeId, fileId: validated.fileId },
    });

    revalidatePath(`/dashboard/modules/employees/${validated.employeeId}`);
    return { success: true, document: container };
  });
}

type DocumentContainerWithFiles = DocumentContainer & { files: File[] };

type FindManyResult = Awaited<ReturnType<PrismaClient["documentContainer"]["findMany"]>>;
type DocumentContainerWithFilesResult = FindManyResult[number] & { files: File[] };

export async function getEmployeeDocuments(employeeId: string): Promise<
  { success: true; documents: DocumentContainerWithFilesResult[] } | { success: false; error: string }
> {
  const { tenantId } = await requirePermission("documents:read");

  return withTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee || employee.tenantId !== tenantId) {
      return { success: false, error: "Mitarbeiter nicht gefunden" };
    }

    const containers = await tx.documentContainer.findMany({
      where: { tenantId, employeeId },
      include: { files: true },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, documents: containers as DocumentContainerWithFilesResult[] };
  });
}

export async function deleteEmployeeDocument(containerId: string, employeeId: string) {
  const { tenantId, session } = await requirePermission("documents:delete");

  return withTenant(tenantId, async (tx) => {
    const container = await tx.documentContainer.findUnique({
      where: { id: containerId },
    });

    if (!container || container.tenantId !== tenantId || container.employeeId !== employeeId) {
      return { success: false, error: "Dokument nicht gefunden" };
    }

    await tx.documentContainer.delete({
      where: { id: containerId },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "DELETE_EMPLOYEE_DOCUMENT",
      resourceType: "DocumentContainer",
      resourceId: containerId,
      metadata: { employeeId },
    });

    revalidatePath(`/dashboard/modules/employees/${employeeId}`);
    return { success: true };
  });
}

export async function createDocumentVersion(containerId: string, fileId: string) {
  const { tenantId, session } = await requirePermission("documents:create");

  return withTenant(tenantId, async (tx) => {
    const container = await tx.documentContainer.findUnique({
      where: { id: containerId },
    });

    if (!container || container.tenantId !== tenantId) {
      return { success: false, error: "Dokument nicht gefunden" };
    }

    const newFile = await tx.file.findUnique({ where: { id: fileId } });
    if (!newFile || newFile.tenantId !== tenantId) {
      return { success: false, error: "Datei nicht gefunden" };
    }

    // Mark all existing files of this container as not latest
    await tx.file.updateMany({
      where: { tenantId, documentContainerId: containerId },
      data: { isLatestVersion: false },
    });

    const latestVersion = await tx.file.findFirst({
      where: { tenantId, documentContainerId: containerId },
      orderBy: { version: "desc" },
      select: { version: true, versionOfId: true },
    });

    const nextVersion = (latestVersion?.version ?? 0) + 1;
    const versionOfId = latestVersion?.versionOfId ?? newFile.id;

    await tx.file.update({
      where: { id: fileId },
      data: {
        employeeId: container.employeeId,
        documentContainerId: containerId,
        version: nextVersion,
        versionOfId,
        isLatestVersion: true,
        category: mapDocumentTypeToFileCategory(container.title),
      },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "CREATE_DOCUMENT_VERSION",
      resourceType: "DocumentContainer",
      resourceId: containerId,
      metadata: { fileId, version: nextVersion },
    });

    revalidatePath(`/dashboard/modules/employees/${container.employeeId}`);
    return { success: true };
  });
}

function mapDocumentTypeToFileCategory(documentType: string) {
  const map: Record<string, string> = {
    contract: "CONTRACT",
    payslip: "PAYSLIP",
    certificate: "CERTIFICATE",
    avatar: "AVATAR",
    document: "DOCUMENT",
  };
  return (map[documentType.toLowerCase()] as File["category"]) || "OTHER";
}

export async function getAllDocumentContainers(params?: { status?: "all" | "expired" | "expiring" | "valid"; search?: string; limit?: number }) {
  const { tenantId } = await requirePermission("documents:read");

  return withTenant(tenantId, async (tx) => {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const where: Prisma.DocumentContainerWhereInput = { tenantId };

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
        { description: { contains: term, mode: "insensitive" } },
        { notes: { contains: term, mode: "insensitive" } },
        { employee: { firstName: { contains: term, mode: "insensitive" } } },
        { employee: { lastName: { contains: term, mode: "insensitive" } } },
      ];
    }

    const containers = await tx.documentContainer.findMany({
      where,
      include: {
        files: { where: { isDeleted: false }, orderBy: { version: "desc" }, take: 1 },
        employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
        uploadedBy: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: params?.limit ?? 100,
    });

    return { success: true, containers };
  });
}

export async function snoozeDocumentContainer(containerId: string, snoozedUntil: string) {
  const { tenantId, session } = await requirePermission("documents:update");

  return withTenant(tenantId, async (tx) => {
    const container = await tx.documentContainer.findUnique({ where: { id: containerId } });
    if (!container || container.tenantId !== tenantId) {
      return { success: false, error: "Dokument nicht gefunden" };
    }

    await tx.documentContainer.update({
      where: { id: containerId },
      data: { snoozedUntil: new Date(snoozedUntil) },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "SNOOZE_DOCUMENT",
      resourceType: "DocumentContainer",
      resourceId: containerId,
      metadata: { snoozedUntil },
    });

    return { success: true };
  });
}

export async function getExpiringDocumentContainers(limit = 10) {
  const { tenantId } = await requirePermission("documents:read");

  return withTenant(tenantId, async (tx) => {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const containers = await tx.documentContainer.findMany({
      where: {
        tenantId,
        expiresAt: { not: null, gte: now, lte: sevenDays },
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lt: now } }],
      },
      include: {
        files: { where: { isDeleted: false }, orderBy: { version: "desc" }, take: 1 },
        employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
      },
      orderBy: { expiresAt: "asc" },
      take: limit,
    });

    return { success: true, containers };
  });
}
