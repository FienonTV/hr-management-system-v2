'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { prismaAdmin } from "@/lib/db/prisma";
import { renderTemplateToPdf, extractVariables, buildEmployeeContext } from "@/lib/pdf/engine";
import { getStorageAdapter } from "@/lib/storage";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";

export async function getDocumentTemplates(includeInactive = false) {
  const { tenantId } = await requirePermission("documents:read");

  const templates = await prismaAdmin.documentTemplate.findMany({
    where: {
      tenantId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: {
      category: true,
    },
    orderBy: { name: "asc" },
  });

  return { success: true, templates };
}

export async function createDocumentTemplate(input: {
  name: string;
  description?: string;
  content: string;
  categoryId?: string;
  isActive?: boolean;
}) {
  const { tenantId, session } = await requirePermission("documentTemplates:manage");
  const userId = session.user.id;

  const variables = extractVariables(input.content);

  const template = await withTenant(tenantId, async (tx) => {
    return tx.documentTemplate.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description || null,
        content: input.content,
        variables,
        categoryId: input.categoryId || null,
        isActive: input.isActive ?? true,
      },
    });
  });

  await logAudit({
    tenantId,
    userId,
    action: "documentTemplate.create",
    resourceType: "documentTemplate",
    resourceId: template.id,
    metadata: { name: template.name, variables },
  });

  revalidatePath("/dashboard/modules/admin/document-templates");
  return { success: true, template };
}

export async function updateDocumentTemplate(
  id: string,
  input: {
    name: string;
    description?: string;
    content: string;
    categoryId?: string;
    isActive?: boolean;
  }
) {
  const { tenantId, session } = await requirePermission("documentTemplates:manage");
  const userId = session.user.id;

  const existing = await prismaAdmin.documentTemplate.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return { success: false, error: "Vorlage nicht gefunden" };
  }

  const variables = extractVariables(input.content);

  const template = await withTenant(tenantId, async (tx) => {
    return tx.documentTemplate.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description || null,
        content: input.content,
        variables,
        categoryId: input.categoryId || null,
        isActive: input.isActive ?? existing.isActive,
      },
    });
  });

  await logAudit({
    tenantId,
    userId,
    action: "documentTemplate.update",
    resourceType: "documentTemplate",
    resourceId: template.id,
    metadata: { name: template.name, variables },
  });

  revalidatePath("/dashboard/modules/admin/document-templates");
  return { success: true, template };
}

export async function deleteDocumentTemplate(id: string) {
  const { tenantId, session } = await requirePermission("documentTemplates:manage");
  const userId = session.user.id;

  const existing = await prismaAdmin.documentTemplate.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return { success: false, error: "Vorlage nicht gefunden" };
  }

  await withTenant(tenantId, async (tx) => {
    return tx.documentTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  });

  await logAudit({
    tenantId,
    userId,
    action: "documentTemplate.delete",
    resourceType: "documentTemplate",
    resourceId: id,
    metadata: { name: existing.name },
  });

  revalidatePath("/dashboard/modules/admin/document-templates");
  return { success: true };
}

export async function generateDocumentFromTemplate(
  templateId: string,
  employeeId: string,
  options: {
    title: string;
    expiresAt?: string;
    notes?: string;
    categoryIds?: string[];
  }
) {
  const { tenantId, session } = await requirePermission("documents:generate");
  const userId = session.user.id;

  const [template, employee, tenant] = await Promise.all([
    prismaAdmin.documentTemplate.findFirst({
      where: { id: templateId, tenantId, isActive: true },
      include: { category: true },
    }),
    prismaAdmin.employee.findFirst({
      where: { id: employeeId, tenantId },
    }),
    prismaAdmin.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    }),
  ]);

  if (!template) return { success: false, error: "Vorlage nicht gefunden" };
  if (!employee) return { success: false, error: "Mitarbeiter nicht gefunden" };

  const context = buildEmployeeContext(
    employee as unknown as Record<string, unknown>,
    tenant?.name ?? "",
    new Date()
  );

  const pdfBuffer = await renderTemplateToPdf(template.content, context, {
    format: "A4",
    printBackground: true,
  });

  const fileId = randomUUID();
  const sanitizedName = `${template.name.replace(/[^a-zA-Z0-9._-\u00C0-\u017F\s]/g, "_")}_${employee.lastName}.pdf`;
  const storageKey = `${tenantId}/${fileId}/${sanitizedName}`;

  const adapter = getStorageAdapter();
  await adapter.upload(storageKey, pdfBuffer, "application/pdf");

  const checksum = createHash("sha256").update(pdfBuffer).digest("hex");

  const created = await withTenant(tenantId, async (tx) => {
    return tx.file.create({
      data: {
        id: fileId,
        tenantId,
        uploadedById: userId,
        employeeId,
        parentType: "documentTemplate",
        parentId: templateId,
        originalName: sanitizedName,
        storageKey,
        mimeType: "application/pdf",
        sizeBytes: pdfBuffer.length,
        checksum,
        isPublic: false,
        category: "DOCUMENT",
        title: options.title || template.name,
        notes: options.notes || null,
        expiresAt: options.expiresAt ? new Date(options.expiresAt) : null,
        version: 1,
        isLatestVersion: true,
        documentCategories: {
          create: (options.categoryIds ?? []).map((categoryId) => ({ categoryId })),
        },
      },
    });
  });

  await logAudit({
    tenantId,
    userId,
    action: "document.generate",
    resourceType: "file",
    resourceId: created.id,
    metadata: {
      templateId: template.id,
      templateName: template.name,
      employeeId,
      sizeBytes: created.sizeBytes,
    },
  });

  revalidatePath("/dashboard/modules/employees/[id]", "page");
  return { success: true, fileId: created.id };
}
