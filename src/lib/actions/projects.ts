'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import type { Project, ProjectEmployee, ProjectMilestone } from "@prisma/client";

export type ProjectWithDetails = Project & {
  employees: (ProjectEmployee & { employee: { id: string; firstName: string; lastName: string } })[];
  milestones: ProjectMilestone[];
  _count?: { timeEntries: number };
};

export type ProjectStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type MilestoneStatus = "OPEN" | "DONE";

export async function getProjects(): Promise<ProjectWithDetails[]> {
  const { tenantId } = await requirePermission("projects:read");
  return withTenant(tenantId, async (tx) => {
    return tx.project.findMany({
      where: { tenantId },
      include: {
        employees: {
          include: { employee: { select: { id: true, firstName: true, lastName: true } } },
        },
        milestones: { orderBy: { plannedDate: "asc" } },
        _count: { select: { timeEntries: true } },
      },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
    }) as unknown as Promise<ProjectWithDetails[]>;
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
      },
    });
    return project as unknown as ProjectWithDetails | null;
  });
}

export async function createProject(data: {
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  budget?: number | null;
  employeeIds?: string[];
}): Promise<{ success: true; project: Project } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("projects:create");
  const start = data.startDate ? new Date(data.startDate) : undefined;
  const end = data.endDate ? new Date(data.endDate) : undefined;

  return withTenant(tenantId, async (tx) => {
    const project = await tx.project.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description ?? null,
        status: data.status ?? "PLANNED",
        startDate: start ?? null,
        endDate: end ?? null,
        budget: data.budget ?? null,
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

    revalidatePath("/dashboard/modules/projects");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "project.create",
      resourceType: "project",
      resourceId: project.id,
      metadata: { name: data.name },
    });

    return { success: true, project };
  });
}

export async function updateProject(
  id: string,
  data: {
    name?: string;
    description?: string;
    status?: ProjectStatus;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
    budget?: number | null;
    employeeIds?: string[];
  }
): Promise<{ success: true; project: Project } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("projects:update");
  const start = data.startDate ? new Date(data.startDate) : undefined;
  const end = data.endDate ? new Date(data.endDate) : undefined;

  return withTenant(tenantId, async (tx) => {
    const existing = await tx.project.findUnique({ where: { id, tenantId } });
    if (!existing) return { success: false, error: "Projekt nicht gefunden" };

    const project = await tx.project.update({
      where: { id, tenantId },
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
        startDate: start ?? existing.startDate,
        endDate: end ?? existing.endDate,
        budget: data.budget ?? existing.budget,
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

    revalidatePath("/dashboard/modules/projects");
    revalidatePath(`/dashboard/modules/projects/${id}`);
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "project.update",
      resourceType: "project",
      resourceId: id,
      metadata: { name: project.name },
    });

    return { success: true, project };
  });
}

export async function deleteProject(id: string): Promise<{ success: true } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("projects:delete");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.project.findUnique({ where: { id, tenantId } });
    if (!existing) return { success: false, error: "Projekt nicht gefunden" };

    await tx.project.delete({ where: { id, tenantId } });

    revalidatePath("/dashboard/modules/projects");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "project.delete",
      resourceType: "project",
      resourceId: id,
      metadata: { name: existing.name },
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
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "project.milestone.create",
      resourceType: "project",
      resourceId: projectId,
      metadata: { title: data.title },
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
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "project.milestone.update",
      resourceType: "projectMilestone",
      resourceId: id,
      metadata: { status },
    });

    return { success: true };
  });
}
