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
import { renderHtmlToPdf, generateDocumentGroupPdf } from "@/lib/pdf/engine";
import { getStorageAdapter } from "@/lib/storage";
import { getLetterheadSettings } from "@/lib/actions/tenantSettings";
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

  // attach variables actually used in this template: custom + known variables present in content
  const knownKeys = new Set(AVAILABLE_VARIABLES.map((v) => v.key));
  const templatesWithVars = templates.map((t) => {
    const usedKeys = new Set(extractCustomVariables(t.content));
    (t.content.match(/\{\{(\w+)\}\}/g) ?? []).forEach((m) => usedKeys.add(m.slice(2, -2)));
    const variables = Array.from(usedKeys).filter((k) => knownKeys.has(k));
    return { ...t, variables };
  });

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

  const [template, employee, tenant, letterhead] = await Promise.all([
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
    getLetterheadSettings(),
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
  const headerHtml = letterhead.mode === "build" && letterhead.companyName
    ? [
        letterhead.companyName,
        letterhead.addressLine1,
        letterhead.addressLine2,
      ]
        .filter(Boolean)
        .join("<br/>")
    : undefined;
  const footerHtml = letterhead.mode === "build" ? letterhead.footerText || undefined : undefined;
  const letterheadPath =
    letterhead.mode === "upload" && letterhead.backgroundFileId
      ? (await prismaAdmin.file.findFirst({
          where: { id: letterhead.backgroundFileId, tenantId },
          select: { storageKey: true },
        }))?.storageKey ?? undefined
      : letterhead.mode === "build" && letterhead.logoFileId
        ? (await prismaAdmin.file.findFirst({
            where: { id: letterhead.logoFileId, tenantId },
            select: { storageKey: true },
          }))?.storageKey ?? undefined
        : undefined;

  const pdfBuffer = await renderHtmlToPdf(substitutedBody, {
    format: "A4",
    printBackground: true,
    marginTop: letterhead.marginTop,
    marginBottom: letterhead.marginBottom,
    marginLeft: letterhead.marginLeft,
    marginRight: letterhead.marginRight,
    headerHtml,
    footerHtml,
    letterheadPath,
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

export async function getTemplateCustomVariablesForMany(
  templateIds: string[]
): Promise<{ success: boolean; variables?: Record<string, string[]>; error?: string }> {
  const { tenantId } = await requirePermission("documents:read");

  const templates = await prismaAdmin.documentTemplate.findMany({
    where: { id: { in: templateIds }, tenantId, isActive: true },
  });

  const result: Record<string, string[]> = {};
  for (const t of templates) {
    result[t.id] = extractCustomVariables(t.content);
  }

  return { success: true, variables: result };
}

export async function generateDocumentGroup(
  employeeId: string,
  options: {
    templateIds: string[];
    customVariables: Record<string, Record<string, string>>;
    title?: string;
    expiresAt?: string;
    notes?: string;
    categoryIds?: string[];
    companyName: string;
    signingCity?: string;
    pageNumbers?: boolean;
    includeSummaryPage?: boolean;
    summaryHeading?: string;
    signatures?: Array<{ label: string; sublabel?: string }>;
    agreementText?: string;
  }
) {
  const { tenantId, session } = await requirePermission("documents:generate");
  const userId = session.user.id;

  const [templates, employee, tenant] = await Promise.all([
    prismaAdmin.documentTemplate.findMany({
      where: { id: { in: options.templateIds }, tenantId, isActive: true },
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

  if (!employee) return { success: false, error: "Mitarbeiter nicht gefunden" };

  const templateMap = new Map(templates.map((t) => [t.id, t]));
  const orderedTemplates: typeof templates = [];
  for (const id of options.templateIds) {
    const t = templateMap.get(id);
    if (t) orderedTemplates.push(t);
  }

  if (orderedTemplates.length !== options.templateIds.length) {
    return { success: false, error: "Eine oder mehrere Vorlagen nicht gefunden" };
  }

  // Validate custom variables are present for each template
  for (const t of orderedTemplates) {
    const keys = extractCustomVariables(t.content);
    const values = options.customVariables[t.id] ?? {};
    const missing = keys.filter((k) => !(k in values));
    if (missing.length > 0) {
      return {
        success: false,
        error: `Bitte Werte für "${t.name}" angeben: ${missing.join(", ")}`,
      };
    }
  }

  const baseContext = buildVariableMap(
    employee as unknown as Parameters<typeof buildVariableMap>[0],
    tenant?.name ?? ""
  );

  const pdfBuffer = await generateDocumentGroupPdf(
    orderedTemplates.map((t) => t.content),
    baseContext,
    {
      companyName: options.companyName,
      signingCity: options.signingCity,
      pageNumbers: options.pageNumbers,
      title: options.title,
      employeeFullName: `${employee.firstName} ${employee.lastName}`,
      includeSummaryPage: options.includeSummaryPage,
      summaryHeading: options.summaryHeading,
      signatures: options.signatures,
      agreementText: options.agreementText,
    }
  );

  const fileId = randomUUID();
  const title = options.title || orderedTemplates[0]?.name || "Dokumentengruppe";
  const sanitizedName = `${title.replace(/[^a-zA-Z0-9._-\u00C0-\u017F\s]/g, "_")}_${employee.lastName}.pdf`;
  const storageKey = `${tenantId}/${fileId}/${sanitizedName}`;

  await getStorageAdapter().upload(storageKey, pdfBuffer, "application/pdf");
  const checksum = createHash("sha256").update(pdfBuffer).digest("hex");

  const created = await withTenant(tenantId, async (tx) => {
    return tx.file.create({
      data: {
        id: fileId,
        tenantId,
        uploadedById: userId,
        employeeId,
        parentType: "documentTemplateGroup",
        parentId: null,
        originalName: sanitizedName,
        storageKey,
        mimeType: "application/pdf",
        sizeBytes: pdfBuffer.length,
        checksum,
        isPublic: false,
        category: "DOCUMENT",
        title,
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
    action: "document.group.generate",
    resourceType: "file",
    resourceId: created.id,
    metadata: {
      templateIds: options.templateIds,
      templateNames: orderedTemplates.map((t) => t.name).join(", "),
      employeeId,
      sizeBytes: created.sizeBytes,
    },
  });

  revalidatePath("/dashboard/modules/employees/[id]", "page");
  return { success: true, fileId: created.id };
}
