'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import type { TimeEntry } from "@prisma/client";
import { timeEntryTypeLabel } from "@/lib/timeEntryUtils";

export type TimeEntryStatus = "DRAFT" | "SUBMITTED" | "APPROVED";
export type TimeEntryType = "REGULAR" | "OVERTIME" | "TRAVEL" | "BREAK";

export type TimeEntryWithRelations = TimeEntry & {
  employee: { id: string; firstName: string; lastName: string };
  project: { id: string; name: string } | null;
  approvedBy: { id: string; firstName: string | null; lastName: string | null } | null;
};

export async function getTimeEntries(filters?: {
  employeeId?: string;
  projectId?: string;
  status?: TimeEntryStatus;
  from?: string | Date;
  to?: string | Date;
}): Promise<TimeEntryWithRelations[]> {
  const { tenantId } = await requirePermission("timeTracking:read");
  return withTenant(tenantId, async (tx) => {
    return tx.timeEntry.findMany({
      where: {
        tenantId,
        employeeId: filters?.employeeId,
        projectId: filters?.projectId,
        status: filters?.status,
        date: {
          gte: filters?.from ? new Date(filters.from) : undefined,
          lte: filters?.to ? new Date(filters.to) : undefined,
        },
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }) as unknown as Promise<TimeEntryWithRelations[]>;
  });
}

export async function createTimeEntry(data: {
  employeeId: string;
  projectId?: string | null;
  date: string | Date;
  hours: number;
  description?: string;
  type?: TimeEntryType;
}): Promise<{ success: true; entry: TimeEntry } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("timeTracking:create");
  return withTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id: data.employeeId, tenantId },
      select: { id: true },
    });
    if (!employee) return { success: false, error: "Mitarbeiter nicht gefunden" };

    if (data.projectId) {
      const project = await tx.project.findUnique({ where: { id: data.projectId, tenantId } });
      if (!project) return { success: false, error: "Projekt nicht gefunden" };
    }

    const entry = await tx.timeEntry.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        projectId: data.projectId ?? null,
        date: new Date(data.date),
        hours: data.hours,
        description: data.description ?? null,
        type: data.type ?? "REGULAR",
        status: "DRAFT",
      },
    });

    revalidatePath(`/dashboard/modules/employees/${data.employeeId}`);
    revalidatePath("/dashboard/modules/time-tracking");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "timeEntry.create",
      resourceType: "timeEntry",
      resourceId: entry.id,
      metadata: { employeeId: data.employeeId, projectId: data.projectId, hours: data.hours },
    });

    return { success: true, entry };
  });
}

export async function approveTimeEntry(
  id: string
): Promise<{ success: true; entry: TimeEntry } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("timeTracking:approve");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.timeEntry.findUnique({ where: { id, tenantId } });
    if (!existing) return { success: false, error: "Zeiteintrag nicht gefunden" };

    const entry = await tx.timeEntry.update({
      where: { id, tenantId },
      data: {
        status: "APPROVED",
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
    });

    revalidatePath(`/dashboard/modules/employees/${existing.employeeId}`);
    revalidatePath("/dashboard/modules/time-tracking");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "timeEntry.approve",
      resourceType: "timeEntry",
      resourceId: id,
      metadata: { employeeId: existing.employeeId },
    });

    return { success: true, entry };
  });
}

export async function deleteTimeEntry(id: string): Promise<{ success: true } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("timeTracking:delete");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.timeEntry.findUnique({ where: { id, tenantId } });
    if (!existing) return { success: false, error: "Zeiteintrag nicht gefunden" };

    await tx.timeEntry.delete({ where: { id, tenantId } });

    revalidatePath(`/dashboard/modules/employees/${existing.employeeId}`);
    revalidatePath("/dashboard/modules/time-tracking");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "timeEntry.delete",
      resourceType: "timeEntry",
      resourceId: id,
      metadata: { employeeId: existing.employeeId },
    });

    return { success: true };
  });
}

export async function exportTimeEntriesCsv(
  from: string | Date,
  to: string | Date
): Promise<{ success: true; csv: string; filename: string } | { success: false; error: string }> {
  const { tenantId } = await requirePermission("timeTracking:read");
  const entries = await getTimeEntries({ from, to });

  const headers = ["Datum", "Mitarbeiter", "Projekt", "Typ", "Stunden", "Beschreibung", "Status"];
  const rows = entries.map((e) => [
    new Date(e.date).toISOString().split("T")[0],
    `${e.employee.firstName} ${e.employee.lastName}`,
    e.project?.name ?? "",
    timeEntryTypeLabel(e.type as TimeEntryType),
    e.hours.toNumber().toString(),
    (e.description ?? "").replace(/"/g, '""'),
    e.status,
  ]);

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(";")).join("\r\n");
  const fromStr = new Date(from).toISOString().split("T")[0];
  const toStr = new Date(to).toISOString().split("T")[0];
  const filename = `time_export_${fromStr}_${toStr}.csv`;

  return { success: true, csv, filename };
}
