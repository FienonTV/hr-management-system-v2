'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import type { Prisma, Project, ProjectEmployee, ProjectMilestone } from "@prisma/client";
import { serializeProjectCustomValue, deserializeProjectCustomValue } from "@/lib/projectCustomValues";

export type ProjectWithDetails = Project & {
  employees: (ProjectEmployee & { employee: { id: string; firstName: string; lastName: string } })[];
  milestones: ProjectMilestone[];
  _count?: { timeEntries: number };
  customValues: Record<string, unknown>;
};

export type ProjectStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type MilestoneStatus = "OPEN" | "DONE";

export async function getProjects(): Promise<ProjectWithDetails[]> {
  const { tenantId } = await requirePermission("projects:read");
  return withTenant(tenantId, async (tx) => {
    const projects = await tx.project.findMany({
      where: { tenantId },
      include: {
        employees: {
          include: { employee: { select: { id: true, firstName: true, lastName: true } } },
        },
        milestones: { orderBy: { plannedDate: "asc" } },
        _count: { select: { timeEntries: true } },
        customValues: { include: { definition: true } },
      },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
    });
    return projects.map((p) => ({
      ...p,
      customValues: Object.fromEntries(
        p.customValues.map((cv) => [
          cv.definition.key,
          deserializeProjectCustomValue(cv.definition.fieldType, cv),
        ])
      ),
    })) as unknown as ProjectWithDetails[];
  });
}

export async function getProjectById(id: string): Promise<ProjectWithDetails | null> {
  const { tenantId } = await requirePermission("projects:read");
  return withTenant(tenantId, async (tx) => {
    const project = await tx.project.findUnique({
      where: { id, tenantId },
      include: {
        employees: {
          include: { employee: { select: { id: true, firstName: true, lastName: true } } },
        },
        milestones: { orderBy: { plannedDate: "asc" } },
        _count: { select: { timeEntries: true } },
        customValues: { include: { definition: true } },
      },
    });
    if (!project) return null;
    return {
      ...project,
      customValues: Object.fromEntries(
        project.customValues.map((cv) => [
          cv.definition.key,
          deserializeProjectCustomValue(cv.definition.fieldType, cv),
        ])
      ),
    } as unknown as ProjectWithDetails;
  });
}

export async function createProject(data: {
  name: string;
  code?: string | null;
  description?: string;
  customValues?: Record<string, unknown>;
  employeeIds?: string[];
}): Promise<{ success: true; project: Project } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("projects:create");

  return withTenant(tenantId, async (tx) => {
    // Derive legacy model fields from custom values for backwards compatibility
    const cv = data.customValues ?? {};
    const start = cv.startDate ? new Date(cv.startDate as string) : null;
    const end = cv.endDate ? new Date(cv.endDate as string) : null;
    const budget = cv.budget ? Number(cv.budget) : null;

    const project = await tx.project.create({
      data: {
        tenantId,
        code: data.code ?? null,
        name: data.name,
        description: data.description ?? null,
        status: (cv.status as ProjectStatus) ?? "PLANNED",
        availableForPlanning: cv.availableForPlanning === true,
        startDate: start,
        endDate: end,
        customerName: cv.customerName ? String(cv.customerName) : null,
        customerEmail: cv.customerEmail ? String(cv.customerEmail) : null,
        address: cv.address ? String(cv.address) : null,
        budget,
        notes: cv.notes ? String(cv.notes) : null,
      },
    });

    if (data.employeeIds?.length) {
      await tx.projectEmployee.createMany({
        data: data.employeeIds.map((employeeId) => ({
          tenantId,
          projectId: project.id,
          employeeId,
        })),
        skipDuplicates: true,
      });
    }

    await saveProjectCustomValues(tx, tenantId, project.id, data.customValues ?? {});

    revalidatePath("/dashboard/modules/projects");
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: session.user.id,
        action: "project.create",
        resourceType: "project",
        resourceId: project.id,
        metadata: { name: data.name },
        ipAddress: "unknown",
        userAgent: "unknown",
      },
    });

    return { success: true, project };
  });
}

export async function updateProject(
  id: string,
  data: {
    name?: string;
    code?: string | null;
    description?: string;
    customValues?: Record<string, unknown>;
    employeeIds?: string[];
  }
): Promise<{ success: true; project: Project } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("projects:update");

  return withTenant(tenantId, async (tx) => {
    const existing = await tx.project.findUnique({ where: { id, tenantId } });
    if (!existing) return { success: false, error: "Projekt nicht gefunden" };

    const cv = data.customValues ?? {};
    const start = cv.startDate ? new Date(cv.startDate as string) : existing.startDate;
    const end = cv.endDate ? new Date(cv.endDate as string) : existing.endDate;
    const budget = cv.budget !== undefined ? (cv.budget === "" || cv.budget == null ? null : Number(cv.budget)) : existing.budget;

    const project = await tx.project.update({
      where: { id, tenantId },
      data: {
        code: data.code !== undefined ? (data.code ?? null) : existing.code,
        name: data.name,
        description: data.description,
        status: cv.status ? (cv.status as ProjectStatus) : existing.status,
        availableForPlanning: cv.availableForPlanning !== undefined ? cv.availableForPlanning === true : existing.availableForPlanning,
        startDate: start,
        endDate: end,
        customerName: cv.customerName !== undefined ? (cv.customerName ? String(cv.customerName) : null) : existing.customerName,
        customerEmail: cv.customerEmail !== undefined ? (cv.customerEmail ? String(cv.customerEmail) : null) : existing.customerEmail,
        address: cv.address !== undefined ? (cv.address ? String(cv.address) : null) : existing.address,
        budget,
        notes: cv.notes !== undefined ? (cv.notes ? String(cv.notes) : null) : existing.notes,
      },
    });

    if (data.employeeIds !== undefined) {
      await tx.projectEmployee.deleteMany({ where: { projectId: id, tenantId } });
      if (data.employeeIds.length) {
        await tx.projectEmployee.createMany({
          data: data.employeeIds.map((employeeId) => ({
            tenantId,
            projectId: id,
            employeeId,
          })),
          skipDuplicates: true,
        });
      }
    }

    await saveProjectCustomValues(tx, tenantId, id, data.customValues ?? {});

    revalidatePath("/dashboard/modules/projects");
    revalidatePath(`/dashboard/modules/projects/${id}`);
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: session.user.id,
        action: "project.update",
        resourceType: "project",
        resourceId: id,
        metadata: { name: project.name },
        ipAddress: "unknown",
        userAgent: "unknown",
      },
    });

    return { success: true, project };
  });
}

async function saveProjectCustomValues(
  tx: Prisma.TransactionClient,
  tenantId: string,
  projectId: string,
  customValues: Record<string, unknown>
) {
  const definitions = await tx.customFieldDefinition.findMany({
    where: { tenantId, appliesTo: "project", isActive: true },
  });

  const byKey = new Map(definitions.map((d) => [d.key, d]));

  for (const [key, value] of Object.entries(customValues)) {
    const def = byKey.get(key);
    if (!def) continue;

    const serialized = serializeProjectCustomValue(def.fieldType, value);
    const payload: Prisma.ProjectCustomValueUncheckedCreateInput = {
      tenantId,
      projectId,
      definitionId: def.id,
    };
    if (serialized.valueText !== undefined) payload.valueText = serialized.valueText;
    if (serialized.valueNumber !== undefined) payload.valueNumber = serialized.valueNumber;
    if (serialized.valueDate !== undefined) payload.valueDate = serialized.valueDate;
    if (serialized.valueBoolean !== undefined) payload.valueBoolean = serialized.valueBoolean;
    if (serialized.valueJson !== undefined && serialized.valueJson !== null) payload.valueJson = serialized.valueJson;

    const updatePayload: Prisma.ProjectCustomValueUncheckedUpdateInput = {};
    if (serialized.valueText !== undefined) updatePayload.valueText = serialized.valueText;
    if (serialized.valueNumber !== undefined) updatePayload.valueNumber = serialized.valueNumber;
    if (serialized.valueDate !== undefined) updatePayload.valueDate = serialized.valueDate;
    if (serialized.valueBoolean !== undefined) updatePayload.valueBoolean = serialized.valueBoolean;
    if (serialized.valueJson !== undefined && serialized.valueJson !== null) updatePayload.valueJson = serialized.valueJson;

    await tx.projectCustomValue.upsert({
      where: {
        tenantId_projectId_definitionId: {
          tenantId,
          projectId,
          definitionId: def.id,
        },
      },
      create: payload,
      update: updatePayload,
    });
  }
}

export async function deleteProject(id: string): Promise<{ success: true } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("projects:delete");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.project.findUnique({ where: { id, tenantId } });
    if (!existing) return { success: false, error: "Projekt nicht gefunden" };

    await tx.project.delete({ where: { id, tenantId } });

    revalidatePath("/dashboard/modules/projects");
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: session.user.id,
        action: "project.delete",
        resourceType: "project",
        resourceId: id,
        metadata: { name: existing.name },
        ipAddress: "unknown",
        userAgent: "unknown",
      },
    });

    return { success: true };
  });
}

export async function createProjectMilestone(
  projectId: string,
  data: { title: string; plannedDate?: string | Date | null; status?: MilestoneStatus }
): Promise<{ success: true } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("projects:update");
  return withTenant(tenantId, async (tx) => {
    const project = await tx.project.findUnique({ where: { id: projectId, tenantId } });
    if (!project) return { success: false, error: "Projekt nicht gefunden" };

    await tx.projectMilestone.create({
      data: {
        tenantId,
        projectId,
        title: data.title,
        plannedDate: data.plannedDate ? new Date(data.plannedDate) : null,
        status: data.status ?? "OPEN",
      },
    });

    revalidatePath(`/dashboard/modules/projects/${projectId}`);
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: session.user.id,
        action: "project.milestone.create",
        resourceType: "project",
        resourceId: projectId,
        metadata: { title: data.title },
        ipAddress: "unknown",
        userAgent: "unknown",
      },
    });

    return { success: true };
  });
}

export async function updateMilestoneStatus(id: string, status: MilestoneStatus): Promise<{ success: true } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("projects:update");
  return withTenant(tenantId, async (tx) => {
    const milestone = await tx.projectMilestone.findUnique({ where: { id, tenantId } });
    if (!milestone) return { success: false, error: "Meilenstein nicht gefunden" };

    await tx.projectMilestone.update({ where: { id, tenantId }, data: { status } });

    revalidatePath(`/dashboard/modules/projects/${milestone.projectId}`);
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: session.user.id,
        action: "project.milestone.update",
        resourceType: "projectMilestone",
        resourceId: id,
        metadata: { status },
        ipAddress: "unknown",
        userAgent: "unknown",
      },
    });

    return { success: true };
  });
}
