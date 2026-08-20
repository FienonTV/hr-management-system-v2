'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import type { DailyPlan, DailyPlanSite, DailyPlanAssignment, Vehicle, Employee, Project } from "@prisma/client";
import { z } from "zod";
import { getLastWorkingDay, parsePoolDepartments } from "@/lib/planningUtils";

const assignmentSchema = z.object({
  employeeId: z.string().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  notes: z.string().optional(),
});

const siteSchema = z.object({
  projectId: z.string().optional(),
  name: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  vehiclePlates: z.array(z.string()).default([]),
  sortOrder: z.number().default(0),
  notes: z.string().optional(),
  assignments: z.array(assignmentSchema).default([]),
});

const planInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  sites: z.array(siteSchema),
});

export type DailyPlanInput = z.infer<typeof planInputSchema>;

export type DailyPlanWithSites = DailyPlan & {
  sites: (DailyPlanSite & {
    project: Project | null;
    assignments: (DailyPlanAssignment & {
      employee: Employee | null;
    })[];
  })[];
};

export async function getDailyPlan(dateStr: string): Promise<{
  success: true;
  plan: DailyPlanWithSites | null;
  isTemplate: boolean;
  isHoliday: boolean;
  holidayName: string | null;
} | { success: false; error: string }> {
  const { tenantId } = await requirePermission("planning:read");
  return withTenant(tenantId, async (tx) => {
    const date = new Date(`${dateStr}T00:00:00`);

    let plan = await tx.dailyPlan.findUnique({
      where: { tenantId_date: { tenantId, date } },
      include: {
        sites: {
          orderBy: { sortOrder: "asc" },
          include: {
            project: true,
            assignments: {
              orderBy: { id: "asc" },
              include: { employee: true },
            },
          },
        },
      },
    });

    let isTemplate = false;
    let isHoliday = false;
    let holidayName: string | null = null;

    if (!plan) {
      const autoCarryOver = await getTenantSetting(tx as any, tenantId, "planning_auto_carry_over", "true") !== "false";
      if (autoCarryOver) {
        const lastWorking = getLastWorkingDay(date);
        const template = await tx.dailyPlan.findUnique({
          where: { tenantId_date: { tenantId, date: lastWorking } },
          include: {
            sites: {
              orderBy: { sortOrder: "asc" },
              include: {
                project: true,
                assignments: {
                  orderBy: { id: "asc" },
                  include: { employee: true },
                  },
              },
            },
          },
        });
        if (template) {
          plan = template;
          isTemplate = true;
        }
      }
    }

    // Check holiday from tenant settings
    const holidaySettings = await tx.tenantSetting.findMany({
      where: { tenantId, key: { startsWith: "holiday_" } },
    });
    const iso = dateStr;
    const match = holidaySettings.find((s) => s.key === `holiday_${iso}`);
    if (match) {
      isHoliday = true;
      holidayName = match.value;
    }

    return { success: true, plan: plan as DailyPlanWithSites | null, isTemplate, isHoliday, holidayName };
  });
}

export async function saveDailyPlan(input: DailyPlanInput): Promise<{ success: true; plan: DailyPlanWithSites } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("planning:update");
  const parsed = planInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((e) => e.message).join(", ") };
  }
  return withTenant(tenantId, async (tx) => {
    const date = new Date(`${parsed.data.date}T00:00:00`);

    const plan = await tx.dailyPlan.upsert({
      where: { tenantId_date: { tenantId, date } },
      update: { status: parsed.data.status },
      create: { tenantId, date, status: parsed.data.status, createdById: session.user.id },
    });

    // Delete existing sites and recreate
    await tx.dailyPlanSite.deleteMany({ where: { planId: plan.id } });

    for (const siteInput of parsed.data.sites) {
      const site = await tx.dailyPlanSite.create({
        data: {
          tenantId,
          planId: plan.id,
          projectId: siteInput.projectId || null,
          name: siteInput.name,
          location: siteInput.location,
          startTime: siteInput.startTime,
          endTime: siteInput.endTime,
          vehiclePlates: siteInput.vehiclePlates,
          sortOrder: siteInput.sortOrder,
          notes: siteInput.notes,
        },
        include: { project: true },
      });

      for (const assignment of siteInput.assignments) {
        const start = assignment.startAt ? new Date(`${parsed.data.date}T${assignment.startAt}`) : null;
        const end = assignment.endAt ? new Date(`${parsed.data.date}T${assignment.endAt}`) : null;
        await tx.dailyPlanAssignment.create({
          data: {
            tenantId,
            siteId: site.id,
            employeeId: assignment.employeeId || null,
            startAt: start,
            endAt: end,
            notes: assignment.notes,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        userId: session.user.id,
        action: "planning.save",
        resourceType: "dailyPlan",
        resourceId: plan.id,
        metadata: { date: parsed.data.date },
        ipAddress: "unknown",
        userAgent: "unknown",
      },
    });

    revalidatePath("/dashboard/modules/planning");

    const saved = await tx.dailyPlan.findUnique({
      where: { id: plan.id },
      include: {
        sites: {
          orderBy: { sortOrder: "asc" },
          include: {
            project: true,
            assignments: { orderBy: { id: "asc" }, include: { employee: true } },
          },
        },
      },
    });

    // Convert Decimal values before returning to client.
    const serialized = JSON.parse(JSON.stringify(saved));

    return { success: true, plan: serialized as DailyPlanWithSites };
  });
}

export async function deleteDailyPlan(dateStr: string): Promise<{ success: true } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("planning:delete");
  return withTenant(tenantId, async (tx) => {
    const date = new Date(`${dateStr}T00:00:00`);
    const plan = await tx.dailyPlan.findUnique({ where: { tenantId_date: { tenantId, date } } });
    if (!plan) return { success: false, error: "Plan nicht gefunden" };
    await tx.dailyPlan.delete({ where: { id: plan.id } });
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: session.user.id,
        action: "planning.delete",
        resourceType: "dailyPlan",
        resourceId: plan.id,
        metadata: { date: dateStr },
        ipAddress: "unknown",
        userAgent: "unknown",
      },
    });
    revalidatePath("/dashboard/modules/planning");
    return { success: true };
  });
}

export async function getPlanningEmployees(): Promise<(Omit<Employee, "hourlyWage"> & { hourlyWage?: number | null; department: { id: string; name: string } | null })[]> {
  const { tenantId } = await requirePermission("planning:read");
  return withTenant(tenantId, async (tx) => {
    const poolDepartmentsRaw = await getTenantSetting(tx as any, tenantId, "planning_pool_departments", "");
    const poolDepartmentIds = poolDepartmentsRaw ? (JSON.parse(poolDepartmentsRaw) as string[]) : [];
    const where: Record<string, unknown> = { tenantId, status: "ACTIVE" };
    if (poolDepartmentIds.length > 0) {
      where.departmentId = { in: poolDepartmentIds };
    }
    const employees = await tx.employee.findMany({
      where,
      include: { department: { select: { id: true, name: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return employees.map((e) => ({
      ...e,
      hourlyWage: e.hourlyWage ? Number(e.hourlyWage) : null,
    }));
  });
}

export async function getPlanningSettings(): Promise<{
  defaultStartTime: string;
  defaultEndTime: string;
  autoCarryOver: boolean;
  weekendMode: "none" | "saturday" | "both";
  poolDepartmentIds: string[];
} | { success: false; error: string }> {
  const { tenantId } = await requirePermission("planning:read");
  return withTenant(tenantId, async (tx) => {
    return {
      defaultStartTime: await getTenantSetting(tx as any, tenantId, "planning_default_start_time", "06:00"),
      defaultEndTime: await getTenantSetting(tx as any, tenantId, "planning_default_end_time", "16:00"),
      autoCarryOver: (await getTenantSetting(tx as any, tenantId, "planning_auto_carry_over", "true")) !== "false",
      weekendMode: (await getTenantSetting(tx as any, tenantId, "planning_weekend_mode", "both")) as "none" | "saturday" | "both",
      poolDepartmentIds: parsePoolDepartments(await getTenantSetting(tx as any, tenantId, "planning_pool_departments", "")),
    };
  });
}

export async function savePlanningSettings(settings: {
  defaultStartTime?: string;
  defaultEndTime?: string;
  autoCarryOver?: boolean;
  weekendMode?: "none" | "saturday" | "both";
  poolDepartmentIds?: string[];
}): Promise<{ success: true } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("tenant:manage");
  return withTenant(tenantId, async (tx) => {
    const upserts = [];
    if (settings.defaultStartTime !== undefined) {
      upserts.push({ key: "planning_default_start_time", value: settings.defaultStartTime });
    }
    if (settings.defaultEndTime !== undefined) {
      upserts.push({ key: "planning_default_end_time", value: settings.defaultEndTime });
    }
    if (settings.autoCarryOver !== undefined) {
      upserts.push({ key: "planning_auto_carry_over", value: String(settings.autoCarryOver) });
    }
    if (settings.weekendMode !== undefined) {
      upserts.push({ key: "planning_weekend_mode", value: settings.weekendMode });
    }
    if (settings.poolDepartmentIds !== undefined) {
      upserts.push({ key: "planning_pool_departments", value: JSON.stringify(settings.poolDepartmentIds) });
    }

    for (const { key, value } of upserts) {
      await tx.tenantSetting.upsert({
        where: { tenantId_key: { tenantId, key } },
        update: { value },
        create: { tenantId, key, value },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        userId: session.user.id,
        action: "planning.settings.update",
        resourceType: "tenantSetting",
        resourceId: "",
        metadata: { keys: upserts.map((u) => u.key) },
        ipAddress: "unknown",
        userAgent: "unknown",
      },
    });

    revalidatePath("/dashboard/modules/admin/settings");
    return { success: true };
  });
}

export async function getPlanningDepartments(): Promise<Array<{ id: string; name: string }>> {
  const { tenantId } = await requirePermission("planning:read");
  return withTenant(tenantId, async (tx) => {
    return tx.department.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  });
}

export async function getActiveProjects(): Promise<Project[]> {
  const { tenantId } = await requirePermission("planning:read");
  return withTenant(tenantId, async (tx) => {
    return tx.project.findMany({
      where: { tenantId, availableForPlanning: true },
      orderBy: { name: "asc" },
    });
  });
}

async function getTenantSetting(tx: any, tenantId: string, key: string, defaultValue: string): Promise<string> {
  const setting = await tx.tenantSetting.findUnique({
    where: { tenantId_key: { tenantId, key } },
  });
  return setting?.value ?? defaultValue;
}
