'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { logAudit, logFileAccess } from "@/lib/audit";
import { prismaAdmin } from "@/lib/db/prisma";
import { getStorageAdapter } from "@/lib/storage";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import type { FileCategory, File as FileRecord } from "@prisma/client";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = [
  "application/pdf",
  "image/",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.",
  "application/vnd.oasis.opendocument.",
  "text/",
];

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_");
}

function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function validateMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

async function getUserContext() {
  const { tenantId, session } = await requirePermission("files:read");
  const user = await prismaAdmin.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, employeeId: true },
  });
  if (!user) {
    throw new Error("Benutzer nicht gefunden");
  }
  return { tenantId, userId: user.id, employeeId: user.employeeId, session };
}

function canManageFile(
  file: FileRecord,
  userId: string,
  employeeId: string | null,
  hasManage: boolean
): boolean {
  if (hasManage) return true;
  if (file.uploadedById === userId) return true;
  if (employeeId && file.employeeId === employeeId) return true;
  return false;
}

async function bufferFromFile(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

function buildStorageKey(tenantId: string, fileId: string, sanitizedName: string): string {
  return `${tenantId}/${fileId}/${sanitizedName}`;
}

export async function uploadFile(
  file: File,
  options: {
    employeeId?: string;
    parentType?: string;
    parentId?: string;
    category?: FileCategory;
    expiresAt?: Date | string;
    isPublic?: boolean;
  }
): Promise<{ success: true; fileId: string; storageKey: string } | { success: false; error: string }> {
  const { tenantId, userId, employeeId, session } = await getUserContext();
  const hasCreate = await checkPermission("files:create");
  const hasManage = await checkPermission("files:manage");

  if (!hasCreate) {
    return { success: false, error: "Keine Berechtigung zum Hochladen" };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { success: false, error: "Datei zu groß (max. 50 MB)" };
  }

  const mimeType = file.type || "application/octet-stream";
  if (!validateMimeType(mimeType)) {
    return { success: false, error: "Dateityp nicht erlaubt" };
  }

  if (options.employeeId && !hasManage) {
    // Employees can only upload to themselves unless they have manage permission.
    if (employeeId !== options.employeeId) {
      return { success: false, error: "Keine Berechtigung für diesen Mitarbeiter" };
    }
  }

  const data = await bufferFromFile(file);
  const checksum = sha256Buffer(data);
  const fileId = randomUUID();
  const sanitizedName = sanitizeFileName(file.name);
  const storageKey = buildStorageKey(tenantId, fileId, sanitizedName);

  const expiresAt = options.expiresAt
    ? typeof options.expiresAt === "string"
      ? new Date(options.expiresAt)
      : options.expiresAt
    : null;

  try {
    await getStorageAdapter().upload(storageKey, data, mimeType);
  } catch (error) {
    console.error("Storage upload failed", error);
    return { success: false, error: "Speichern der Datei fehlgeschlagen" };
  }

  return withTenant(tenantId, async (tx) => {
    const created = await tx.file.create({
      data: {
        id: fileId,
        tenantId,
        uploadedById: userId,
        employeeId: options.employeeId || employeeId || null,
        parentType: options.parentType || null,
        parentId: options.parentId || null,
        originalName: file.name,
        storageKey,
        mimeType,
        sizeBytes: file.size,
        checksum,
        isPublic: options.isPublic ?? false,
        expiresAt,
        category: options.category || "OTHER",
        version: 1,
        isLatestVersion: true,
      },
    });

    await logAudit({
      tenantId,
      userId,
      action: "file.create",
      resourceType: "file",
      resourceId: created.id,
      metadata: {
        originalName: created.originalName,
        sizeBytes: created.sizeBytes,
        mimeType: created.mimeType,
        category: created.category,
      },
    });

    return { success: true, fileId: created.id, storageKey: created.storageKey };
  });
}

export async function downloadFile(
  fileId: string
): Promise<{ data: Buffer; file: FileRecord } | { error: string }> {
  const { tenantId, userId, employeeId } = await getUserContext();
  const hasManage = await checkPermission("files:manage");

  return withTenant(tenantId, async (tx) => {
    const file = await tx.file.findUnique({ where: { id: fileId } });
    if (!file || file.isDeleted) {
      return { error: "Datei nicht gefunden" };
    }

    if (!canManageFile(file, userId, employeeId, hasManage)) {
      return { error: "Keine Berechtigung" };
    }

    const data = await getStorageAdapter().download(file.storageKey);

    await logFileAccess({
      tenantId,
      userId,
      accessType: "download",
      fileId: file.id,
      fileName: file.originalName,
      storageKey: file.storageKey,
    });

    return { data, file };
  });
}

export async function deleteFile(fileId: string): Promise<{ success: boolean; error?: string }> {
  const { tenantId, userId, employeeId, session } = await getUserContext();
  const hasDelete = await checkPermission("files:delete");
  const hasManage = await checkPermission("files:manage");

  return withTenant(tenantId, async (tx) => {
    const file = await tx.file.findUnique({ where: { id: fileId } });
    if (!file || file.isDeleted) {
      return { success: false, error: "Datei nicht gefunden" };
    }

    if (!hasDelete && !canManageFile(file, userId, employeeId, hasManage)) {
      return { success: false, error: "Keine Berechtigung zum Löschen" };
    }

    await tx.file.update({
      where: { id: fileId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: userId,
      },
    });

    await logAudit({
      tenantId,
      userId,
      action: "file.delete",
      resourceType: "file",
      resourceId: file.id,
      metadata: { originalName: file.originalName, storageKey: file.storageKey },
    });

    return { success: true };
  });
}

export async function permanentlyDeleteFile(
  fileId: string
): Promise<{ success: boolean; error?: string }> {
  await requirePermission("files:manage");
  const { tenantId, userId } = await getUserContext();

  return withTenant(tenantId, async (tx) => {
    const file = await tx.file.findUnique({ where: { id: fileId } });
    if (!file) {
      return { success: false, error: "Datei nicht gefunden" };
    }

    if (!file.isDeleted) {
      return { success: false, error: "Datei muss zuerst in den Papierkorb verschoben werden" };
    }

    await getStorageAdapter().delete(file.storageKey);
    await tx.file.delete({ where: { id: fileId } });

    await logAudit({
      tenantId,
      userId,
      action: "file.permanent_delete",
      resourceType: "file",
      resourceId: file.id,
      metadata: { originalName: file.originalName, storageKey: file.storageKey },
    });

    return { success: true };
  });
}

export async function restoreFile(fileId: string): Promise<{ success: boolean; error?: string }> {
  await requirePermission("files:manage");
  const { tenantId, userId } = await getUserContext();

  return withTenant(tenantId, async (tx) => {
    const file = await tx.file.findUnique({ where: { id: fileId } });
    if (!file || !file.isDeleted) {
      return { success: false, error: "Datei nicht im Papierkorb" };
    }

    await tx.file.update({
      where: { id: fileId },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedById: null,
      },
    });

    await logAudit({
      tenantId,
      userId,
      action: "file.restore",
      resourceType: "file",
      resourceId: file.id,
      metadata: { originalName: file.originalName, storageKey: file.storageKey },
    });

    return { success: true };
  });
}

export async function listFiles(options: {
  employeeId?: string;
  parentType?: string;
  parentId?: string;
  category?: FileCategory;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ files: FileRecord[]; total: number; hasMore: boolean }> {
  const { tenantId, userId, employeeId } = await getUserContext();
  const hasManage = await checkPermission("files:manage");

  const limit = Math.min(options.limit ?? 50, 200);
  const offset = options.offset ?? 0;

  const where: Record<string, unknown> = {
    isDeleted: options.includeDeleted ? undefined : false,
    employeeId: options.employeeId,
    parentType: options.parentType,
    parentId: options.parentId,
    category: options.category,
  };

  if (!hasManage) {
    // Non-managers only see their own files or files linked to their employee record.
    where.OR = [
      { uploadedById: userId },
      ...(employeeId ? [{ employeeId }] : []),
    ];
  }

  return withTenant(tenantId, async (tx) => {
    const [files, total] = await Promise.all([
      tx.file.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      tx.file.count({ where }),
    ]);
    return { files, total, hasMore: offset + files.length < total };
  });
}

export async function uploadNewVersion(
  fileId: string,
  file: File
): Promise<{ success: true; fileId: string } | { success: false; error: string }> {
  const { tenantId, userId, employeeId } = await getUserContext();
  const hasCreate = await checkPermission("files:create");
  const hasManage = await checkPermission("files:manage");

  if (!hasCreate) {
    return { success: false, error: "Keine Berechtigung zum Hochladen" };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { success: false, error: "Datei zu groß (max. 50 MB)" };
  }

  const mimeType = file.type || "application/octet-stream";
  if (!validateMimeType(mimeType)) {
    return { success: false, error: "Dateityp nicht erlaubt" };
  }

  return withTenant(tenantId, async (tx) => {
    const existing = await tx.file.findUnique({ where: { id: fileId } });
    if (!existing || existing.isDeleted) {
      return { success: false, error: "Ursprungsdatei nicht gefunden" };
    }

    if (!canManageFile(existing, userId, employeeId, hasManage)) {
      return { success: false, error: "Keine Berechtigung für diese Datei" };
    }

    // Mark previous file as not latest if it was the latest version.
    if (existing.isLatestVersion) {
      await tx.file.update({
        where: { id: existing.id },
        data: { isLatestVersion: false },
      });
    }

    const data = await bufferFromFile(file);
    const checksum = sha256Buffer(data);
    const newFileId = randomUUID();
    const sanitizedName = sanitizeFileName(file.name);
    const storageKey = buildStorageKey(tenantId, newFileId, sanitizedName);

    try {
      await getStorageAdapter().upload(storageKey, data, mimeType);
    } catch (error) {
      console.error("Storage upload failed", error);
      return { success: false, error: "Speichern der Datei fehlgeschlagen" };
    }

    const versionOfId = existing.versionOfId || existing.id;
    const version = existing.version + 1;

    const created = await tx.file.create({
      data: {
        id: newFileId,
        tenantId,
        uploadedById: userId,
        employeeId: existing.employeeId,
        parentType: existing.parentType,
        parentId: existing.parentId,
        originalName: file.name,
        storageKey,
        mimeType,
        sizeBytes: file.size,
        checksum,
        isPublic: existing.isPublic,
        expiresAt: existing.expiresAt,
        metadata: existing.metadata ?? undefined,
        category: existing.category,
        version,
        versionOfId,
        isLatestVersion: true,
      },
    });

    await logAudit({
      tenantId,
      userId,
      action: "file.version.create",
      resourceType: "file",
      resourceId: created.id,
      metadata: {
        originalName: created.originalName,
        versionOfId,
        version,
      },
    });

    return { success: true, fileId: created.id };
  });
}

export async function getFileVersions(fileId: string): Promise<FileRecord[]> {
  await requirePermission("files:read");
  const { tenantId, userId, employeeId } = await getUserContext();
  const hasManage = await checkPermission("files:manage");

  return withTenant(tenantId, async (tx) => {
    const file = await tx.file.findUnique({ where: { id: fileId } });
    if (!file || file.isDeleted) {
      throw new Error("Datei nicht gefunden");
    }
    if (!canManageFile(file, userId, employeeId, hasManage)) {
      throw new Error("Keine Berechtigung");
    }

    const rootId = file.versionOfId || file.id;
    return tx.file.findMany({
      where: {
        OR: [
          { id: rootId },
          { versionOfId: rootId },
        ],
        isDeleted: false,
      },
      orderBy: { version: "asc" },
    });
  });
}

async function checkPermission(permission: string): Promise<boolean> {
  try {
    await requirePermission(permission);
    return true;
  } catch {
    return false;
  }
}
