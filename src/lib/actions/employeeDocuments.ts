'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { File as FileRecord, FileCategory, Prisma, DocumentContainer } from "@prisma/client";

const CreateDocumentSchema = z.object({
  employeeId: z.string().min(1),
  fileId: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
});

const UploadVersionSchema = z.object({
  containerId: z.string().min(1),
  fileId: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
});

export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;
export type UploadVersionInput = z.infer<typeof UploadVersionSchema>;

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
    const file = await tx.file.findUnique({ where: { id: validated.fileId } });
    if (!file || file.tenantId !== tenantId) {
      return { success: false, error: "Datei nicht gefunden" };
    }

    const employee = await tx.employee.findUnique({ where: { id: validated.employeeId } });
    if (!employee || employee.tenantId !== tenantId) {
      return { success: false, error: "Mitarbeiter nicht gefunden" };
    }

    const container = await tx.documentContainer.create({
      data: {
        tenantId,
        employeeId: validated.employeeId,
        title: validated.title,
        notes: validated.notes ?? null,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        category,
      },
    });

    const updated = await tx.file.update({
      where: { id: validated.fileId },
      data: {
        employeeId: validated.employeeId,
        containerId: container.id,
        title: validated.title,
        category,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        notes: validated.notes ?? null,
        version: 1,
        isLatestVersion: true,
      },
    });

    if (validated.categoryIds?.length) {
      await tx.fileDocumentCategory.createMany({
        data: validated.categoryIds.map((categoryId) => ({
          fileId: updated.id,
          categoryId,
        })),
      });
    }

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "document.container.create",
      resourceType: "DocumentContainer",
      resourceId: container.id,
      metadata: { employeeId: validated.employeeId, fileId: updated.id, version: 1 },
    });

    revalidatePath(`/dashboard/modules/employees/${validated.employeeId}`);
    return { success: true, document: updated, container };
  });
}

export async function uploadDocumentVersion(data: unknown) {
  const { tenantId, session } = await requirePermission("documents:create");
  const validated = UploadVersionSchema.parse(data);
  const category = mapDocumentTypeToCategory(validated.category);

  return withTenant(tenantId, async (tx) => {
    const file = await tx.file.findUnique({ where: { id: validated.fileId } });
    if (!file || file.tenantId !== tenantId) {
      return { success: false, error: "Datei nicht gefunden" };
    }

    const container = await tx.documentContainer.findUnique({
      where: { id: validated.containerId },
      include: { files: { where: { isDeleted: false }, orderBy: { version: "desc" }, take: 1 } },
    });
    if (!container || container.tenantId !== tenantId) {
      return { success: false, error: "Dokument nicht gefunden" };
    }

    const nextVersion = (container.files[0]?.version ?? 0) + 1;

    // Mark previous versions as not latest
    await tx.file.updateMany({
      where: { containerId: container.id },
      data: { isLatestVersion: false },
    });

    const updated = await tx.file.update({
      where: { id: validated.fileId },
      data: {
        employeeId: container.employeeId,
        containerId: container.id,
        title: validated.title,
        category,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        notes: validated.notes ?? null,
        version: nextVersion,
        isLatestVersion: true,
      },
    });

    if (validated.categoryIds?.length) {
      await tx.fileDocumentCategory.createMany({
        data: validated.categoryIds.map((categoryId) => ({
          fileId: updated.id,
          categoryId,
        })),
      });
    }

    // Container übernimmt Metadaten der neuesten Version
    await tx.documentContainer.update({
      where: { id: container.id },
      data: {
        title: validated.title,
        category,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        notes: validated.notes ?? null,
      },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "document.container.version.add",
      resourceType: "DocumentContainer",
      resourceId: container.id,
      metadata: { fileId: updated.id, version: nextVersion },
    });

    if (container.employeeId) {
      revalidatePath(`/dashboard/modules/employees/${container.employeeId}`);
    }
    revalidatePath(`/dashboard/modules/documents`);
    return { success: true, document: updated, container };
  });
}

export type DocumentContainerWithLatest = DocumentContainer & {
  latestFile: FileRecord | null;
  versionCount: number;
  categories: { id: string; name: string; color: string | null }[];
  employee?: { firstName: string | null; lastName: string | null; employeeNumber: string | null } | null;
};

export async function getEmployeeDocuments(employeeId: string): Promise<
  { success: true; documents: DocumentContainerWithLatest[] } | { success: false; error: string }
> {
  const { tenantId } = await requirePermission("documents:read");

  return withTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.tenantId !== tenantId) {
      return { success: false, error: "Mitarbeiter nicht gefunden" };
    }

    const containers = await tx.documentContainer.findMany({
      where: {
        tenantId,
        employeeId,
        isDeleted: false,
      },
      orderBy: { updatedAt: "desc" },
      include: {
        files: {
          where: { isDeleted: false },
          orderBy: { version: "desc" },
          take: 1,
          include: {
            documentCategories: { include: { category: true } },
          },
        },
      },
    });

    const result: DocumentContainerWithLatest[] = containers.map((c) => {
      const latestFile = c.files[0] ?? null;
      return {
        ...c,
        latestFile,
        versionCount: c.files.length, // because we only took 1, this is wrong; fix below
        categories: latestFile?.documentCategories.map((dc) => ({
          id: dc.category.id,
          name: dc.category.name,
          color: dc.category.color,
        })) ?? [],
      };
    });

    // fix version count with a separate query
    const counts = await tx.file.groupBy({
      by: ["containerId"],
      where: { tenantId, employeeId, isDeleted: false, containerId: { not: null } },
      _count: { id: true },
    });
    const countMap = new Map<string, number>(counts.map((c) => [c.containerId!, Number((c._count as { id: number }).id)]));
    for (const r of result) {
      r.versionCount = countMap.get(r.id) ?? 1;
    }

    return { success: true, documents: result };
  });
}

export async function deleteEmployeeDocument(containerId: string, employeeId?: string) {
  const { tenantId, session } = await requirePermission("documents:delete");

  return withTenant(tenantId, async (tx) => {
    const container = await tx.documentContainer.findUnique({ where: { id: containerId } });
    if (!container || container.tenantId !== tenantId) {
      return { success: false, error: "Dokument nicht gefunden" };
    }

    await tx.documentContainer.update({
      where: { id: containerId },
      data: { isDeleted: true, deletedAt: new Date(), deletedById: session.user.id },
    });

    await tx.file.updateMany({
      where: { containerId },
      data: { isDeleted: true, deletedAt: new Date(), deletedById: session.user.id },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "document.container.delete",
      resourceType: "DocumentContainer",
      resourceId: containerId,
      metadata: { employeeId: container.employeeId },
    });

    if (employeeId) {
      revalidatePath(`/dashboard/modules/employees/${employeeId}`);
    }
    revalidatePath(`/dashboard/modules/documents`);
    return { success: true };
  });
}

export async function getDocumentVersions(containerId: string): Promise<
  { success: true; versions: FileRecord[] } | { success: false; error: string }
> {
  const { tenantId } = await requirePermission("documents:read");

  return withTenant(tenantId, async (tx) => {
    const container = await tx.documentContainer.findUnique({ where: { id: containerId } });
    if (!container || container.tenantId !== tenantId) {
      return { success: false, error: "Dokument nicht gefunden" };
    }

    const versions = await tx.file.findMany({
      where: { tenantId, containerId, isDeleted: false },
      orderBy: { version: "desc" },
    });

    return { success: true, versions };
  });
}

export async function snoozeDocument(containerId: string, untilIso: string) {
  const { tenantId, session } = await requirePermission("documents:update");

  return withTenant(tenantId, async (tx) => {
    const container = await tx.documentContainer.findUnique({ where: { id: containerId } });
    if (!container || container.tenantId !== tenantId) {
      return { success: false, error: "Dokument nicht gefunden" };
    }

    await tx.documentContainer.update({
      where: { id: containerId },
      data: { snoozedUntil: new Date(untilIso) },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "document.container.snooze",
      resourceType: "DocumentContainer",
      resourceId: containerId,
      metadata: { until: untilIso },
    });

    revalidatePath(`/dashboard/modules/documents`);
    if (container.employeeId) {
      revalidatePath(`/dashboard/modules/employees/${container.employeeId}`);
    }
    return { success: true };
  });
}

export async function getExpiringDocuments(limit = 5) {
  const { tenantId } = await requirePermission("documents:read");

  return withTenant(tenantId, async (tx) => {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const containers = await tx.documentContainer.findMany({
      where: {
        tenantId,
        isDeleted: false,
        expiresAt: { lte: sevenDays, gte: now },
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lt: now } }],
      },
      orderBy: { expiresAt: "asc" },
      take: limit,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
        files: {
          where: { isDeleted: false },
          orderBy: { version: "desc" },
          take: 1,
          include: {
            documentCategories: { include: { category: true } },
          },
        },
      },
    });

    const result = containers.map((c) => {
      const latestFile = c.files[0] ?? null;
      return {
        ...c,
        latestFile,
        versionCount: 1,
        categories: latestFile?.documentCategories.map((dc) => ({
          id: dc.category.id,
          name: dc.category.name,
          color: dc.category.color,
        })) ?? [],
      };
    });
    const counts = await tx.file.groupBy({
      by: ["containerId"],
      where: { tenantId, isDeleted: false, containerId: { in: result.map((r) => r.id) } },
      _count: { id: true },
    });
    const countMap = new Map(counts.map((c) => [c.containerId!, (c._count as { id: number }).id]));
    for (const r of result) {
      r.versionCount = countMap.get(r.id) ?? 1;
    }

    return { success: true, documents: result as DocumentContainerWithLatest[] };
  });
}

export async function getAllDocuments(params?: { status?: "all" | "expired" | "expiring" | "valid"; search?: string; limit?: number }) {
  const { tenantId } = await requirePermission("documents:read");

  return withTenant(tenantId, async (tx) => {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const where: Prisma.DocumentContainerWhereInput = {
      tenantId,
      isDeleted: false,
    };

    const status = params?.status ?? "all";
    if (status === "expired") {
      where.expiresAt = { lt: now };
    } else if (status === "expiring") {
      where.expiresAt = { gte: now, lte: sevenDays };
    } else if (status === "valid") {
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: sevenDays } },
      ];
    }

    const search = params?.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { employee: { firstName: { contains: search, mode: "insensitive" } } },
        { employee: { lastName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const containers = await tx.documentContainer.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: params?.limit ?? 200,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
        files: {
          where: { isDeleted: false },
          orderBy: { version: "desc" },
          take: 1,
          include: {
            documentCategories: { include: { category: true } },
          },
        },
      },
    });

    const result: DocumentContainerWithLatest[] = containers.map((c) => {
      const latestFile = c.files[0] ?? null;
      return {
        ...c,
        latestFile,
        versionCount: c.files.length,
        categories: latestFile?.documentCategories.map((dc) => ({
          id: dc.category.id,
          name: dc.category.name,
          color: dc.category.color,
        })) ?? [],
      };
    });

    // Fix version counts
    if (result.length > 0) {
      const counts = await tx.file.groupBy({
        by: ["containerId"],
        where: { tenantId, isDeleted: false, containerId: { in: result.map((r) => r.id) } },
        _count: { id: true },
      });
      const countMap = new Map<string, number>(counts.map((c) => [c.containerId!, Number((c._count as { id: number }).id)]));
      for (const r of result) {
        r.versionCount = countMap.get(r.id) ?? 1;
      }
    }

    return { success: true, documents: result };
  });
}
