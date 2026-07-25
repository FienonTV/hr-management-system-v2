'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PrismaClient, File } from "@prisma/client";

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

    const document = await tx.employeeDocument.create({
      data: {
        tenantId,
        employeeId: validated.employeeId,
        fileId: validated.fileId,
        documentType: validated.documentType,
        validFrom: validated.validFrom ? new Date(validated.validFrom) : null,
        validUntil: validated.validUntil ? new Date(validated.validUntil) : null,
        notes: validated.notes ?? null,
      },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "CREATE_EMPLOYEE_DOCUMENT",
      resourceType: "EmployeeDocument",
      resourceId: document.id,
      metadata: { employeeId: validated.employeeId, fileId: validated.fileId },
    });

    revalidatePath(`/dashboard/modules/employees/${validated.employeeId}`);
    return { success: true, document };
  });
}

type DocumentWithFile = Awaited<ReturnType<PrismaClient["employeeDocument"]["findUnique"]>> & { file: File };

export async function getEmployeeDocuments(employeeId: string): Promise<
  { success: true; documents: DocumentWithFile[] } | { success: false; error: string }
> {
  const { tenantId } = await requirePermission("documents:read");

  return withTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id: employeeId },
      include: {
        documents: {
          include: { file: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!employee || employee.tenantId !== tenantId) {
      return { success: false, error: "Mitarbeiter nicht gefunden" };
    }

    return { success: true, documents: employee.documents as DocumentWithFile[] };
  });
}

export async function deleteEmployeeDocument(documentId: string, employeeId: string) {
  const { tenantId, session } = await requirePermission("documents:delete");

  return withTenant(tenantId, async (tx) => {
    const document = await tx.employeeDocument.findUnique({
      where: { id: documentId },
    });

    if (!document || document.tenantId !== tenantId || document.employeeId !== employeeId) {
      return { success: false, error: "Dokument nicht gefunden" };
    }

    await tx.employeeDocument.delete({
      where: { id: documentId },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "DELETE_EMPLOYEE_DOCUMENT",
      resourceType: "EmployeeDocument",
      resourceId: documentId,
      metadata: { fileId: document.fileId },
    });

    revalidatePath(`/dashboard/modules/employees/${employeeId}`);
    return { success: true };
  });
}
