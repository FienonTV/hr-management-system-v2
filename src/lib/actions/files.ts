'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { logAudit, logFileAccess } from "@/lib/audit";
import { prismaAdmin } from "@/lib/db/prisma";
import { getStorageAdapter } from "@/lib/storage";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import type { FileCategory, File as FileRecord } from "@prisma/client";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_NAME_LENGTH = 255;

// MIME type whitelist (exact or prefix)
const ALLOWED_MIME_TYPES: (string | RegExp)[] = [
  "application/pdf",
  /^image\/(png|jpeg|jpg|gif|webp|svg\+xml|bmp)$/,
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "text/plain",
  "text/csv",
];

interface FileSignature {
  mime: string;
  signatures: (number[] | ((header: number[]) => boolean))[];
}

// Magic bytes for common document/image formats
const FILE_SIGNATURES: FileSignature[] = [
  {
    mime: "application/pdf",
    signatures: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  },
  {
    mime: "image/png",
    signatures: [[0x89, 0x50, 0x4e, 0x47]], // PNG
  },
  {
    mime: "image/jpeg",
    signatures: [
      [0xff, 0xd8, 0xff, 0xe0],
      [0xff, 0xd8, 0xff, 0xe1],
      [0xff, 0xd8, 0xff, 0xe8],
      [0xff, 0xd8, 0xff, 0xdb],
      [0xff, 0xd8, 0xff, 0xee],
    ],
  },
  {
    mime: "image/gif",
    signatures: [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
    ],
  },
  {
    mime: "image/webp",
    signatures: [
      (header) =>
        header.length >= 12 &&
        header[0] === 0x52 &&
        header[1] === 0x49 &&
        header[2] === 0x46 &&
        header[3] === 0x46 &&
        header[8] === 0x57 &&
        header[9] === 0x45 &&
        header[10] === 0x42 &&
        header[11] === 0x50,
    ],
  },
  {
    mime: "image/bmp",
    signatures: [[0x42, 0x4d]], // BM
  },
  {
    mime: "image/svg+xml",
    signatures: [
      (header) => {
        const prefix = String.fromCharCode(...header.slice(0, 100)).toLowerCase();
        return prefix.includes("<?xml") && prefix.includes("svg");
      },
    ],
  },
  {
    mime: "application/zip",
    signatures: [
      [0x50, 0x4b, 0x03, 0x04],
      [0x50, 0x4b, 0x05, 0x06],
      [0x50, 0x4b, 0x07, 0x08],
    ],
  },
];

function sanitizeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-\u00C0-\u017F\s]/g, "_").replace(/_{2,}/g, "_").trim();
  if (base.length > MAX_FILE_NAME_LENGTH) {
    const ext = base.lastIndexOf(".") > 0 ? base.slice(base.lastIndexOf(".")) : "";
    return base.slice(0, MAX_FILE_NAME_LENGTH - ext.length) + ext;
  }
  return base || "unnamed";
}

function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function validateMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.some((allowed) =>
    typeof allowed === "string" ? allowed === mimeType : allowed.test(mimeType)
  );
}

function validateMagicBytes(buffer: Buffer, declaredMime: string): boolean {
  const header = Array.from(buffer.slice(0, 64));

  // SVG is text-based: skip binary magic-byte check, rely on content sniffing
  if (declaredMime === "image/svg+xml") {
    const text = buffer.toString("utf8", 0, 200).toLowerCase();
    return text.includes("<svg") || (text.includes("<?xml") && text.includes("svg"));
  }

  for (const sig of FILE_SIGNATURES) {
    if (declaredMime.startsWith(sig.mime) || sig.mime === "application/zip") {
      for (const candidate of sig.signatures) {
        if (typeof candidate === "function") {
          if (candidate(header)) return true;
        } else {
          const matches = candidate.every((byte, i) => header[i] === byte);
          if (matches) return true;
        }
      }
    }
  }

  // Plain text / CSV: verify decodable as UTF-8 and no null bytes
  if (declaredMime.startsWith("text/")) {
    try {
      const text = buffer.toString("utf8", 0, Math.min(buffer.length, 512));
      return !text.includes("\u0000");
    } catch {
      return false;
    }
  }

  return false;
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
    return { success: false, error: "Datei zu groß (max. 10 MB)" };
  }

  const mimeType = file.type || "application/octet-stream";
  if (!validateMimeType(mimeType)) {
    return { success: false, error: "Dateityp nicht erlaubt" };
  }

  const data = await bufferFromFile(file);
  if (!validateMagicBytes(data, mimeType)) {
    return { success: false, error: "Dateiinhalt stimmt nicht mit angegebenem Dateityp überein" };
  }

  if (options.employeeId && !hasManage) {
    // Employees can only upload to themselves unless they have manage permission.
    if (employeeId !== options.employeeId) {
      return { success: false, error: "Keine Berechtigung für diesen Mitarbeiter" };
    }
  }

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
