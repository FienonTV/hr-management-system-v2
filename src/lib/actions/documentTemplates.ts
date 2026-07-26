'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { prismaAdmin } from "@/lib/db/prisma";
import {
  substituteVariables,
  extractCustomVariables,
  buildVariableMap,
  AVAILABLE_VARIABLES,
} from "@/lib/templateVariables";
import { renderHtmlToPdf } from "@/lib/pdf/engine";
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

  // attach known + custom variables for each template
  const templatesWithVars = templates.map((t) => ({
    ...t,
    variables: Array.from(
      new Set([...extractCustomVariables(t.content), ...AVAILABLE_VARIABLES.map((v) => v.key)])
    ),
  }));

  return { success: true, templates: templatesWithVars };
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

  const variables = extractCustomVariables(input.content);

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

  const variables = extractCustomVariables(input.content);

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
    customValues?: Record<string, string>;
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

  const customValues = options.customValues ?? {};
  const missingCustom = extractCustomVariables(template.content).filter((key) => !(key in customValues));
  if (missingCustom.length > 0) {
    return {
      success: false,
      error: `Bitte Werte für Variablen angeben: ${missingCustom.join(", ")}`,
    };
  }

  const context = buildVariableMap(
    employee as unknown as Parameters<typeof buildVariableMap>[0],
    tenant?.name ?? "",
    customValues
  );

  const substitutedBody = substituteVariables(template.content, context);
  const pdfBuffer = await renderHtmlToPdf(substitutedBody, {
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

export async function getTemplateCustomVariables(templateId: string): Promise<{
  success: boolean;
  variables?: string[];
  error?: string;
}> {
  const { tenantId } = await requirePermission("documents:read");

  const template = await prismaAdmin.documentTemplate.findFirst({
    where: { id: templateId, tenantId, isActive: true },
  });
  if (!template) return { success: false, error: "Vorlage nicht gefunden" };

  return { success: true, variables: extractCustomVariables(template.content) };
}
