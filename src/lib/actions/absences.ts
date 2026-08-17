'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import type { AbsenceRequest, Prisma } from "@prisma/client";

export type AbsenceRequestRecord = AbsenceRequest & {
  employee: { id: string; firstName: string; lastName: string; employeeNumber: string | null };
  requestedBy: { id: string; email: string } | null;
  approvedBy: { id: string; email: string } | null;
};

export type AbsenceInput = {
  employeeId: string;
  type: "VACATION" | "SICK" | "PARENTAL" | "UNPAID" | "OTHER";
  startAt: Date | string;
  endAt: Date | string;
  notes?: string;
};

function businessDays(start: Date, end: Date) {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function getAbsenceRequests(filters?: {
  employeeId?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  startAt?: Date | string;
  endAt?: Date | string;
}): Promise<AbsenceRequestRecord[]> {
  const { tenantId } = await requirePermission("absences:read");
  return withTenant(tenantId, async (tx) => {
    const where: Prisma.AbsenceRequestWhereInput = {};
    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.status) where.status = filters.status;
    if (filters?.startAt && filters?.endAt) {
      where.OR = [
        { startAt: { gte: new Date(filters.startAt), lte: new Date(filters.endAt) } },
        { endAt: { gte: new Date(filters.startAt), lte: new Date(filters.endAt) } },
        { startAt: { lte: new Date(filters.startAt) }, endAt: { gte: new Date(filters.endAt) } },
      ];
    }
    return tx.absenceRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        requestedBy: { select: { id: true, email: true } },
        approvedBy: { select: { id: true, email: true } },
      },
      orderBy: { startAt: "asc" },
    });
  });
}

export async function createAbsenceRequest(
  data: AbsenceInput
): Promise<
  | { success: true; request: AbsenceRequestRecord }
  | { success: false; error: string }
> {
  const { tenantId, session } = await requirePermission("absences:create");
  const startAt = new Date(data.startAt);
  const endAt = new Date(data.endAt);
  if (startAt > endAt) return { success: false, error: "Ende liegt vor Beginn" };

  return withTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id: data.employeeId },
      select: { vacationDays: true, status: true },
    });
    if (!employee || employee.status === "TERMINATED") {
      return { success: false, error: "Mitarbeiter nicht gefunden oder inaktiv" };
    }

    if (data.type === "VACATION" && employee.vacationDays != null) {
      const requestedDays = businessDays(startAt, endAt);
      if (requestedDays > employee.vacationDays) {
        return { success: false, error: `Nur noch ${employee.vacationDays} Urlaubstage verfügbar` };
      }
    }

    const request = await tx.absenceRequest.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        type: data.type,
        startAt,
        endAt,
        notes: data.notes ?? null,
        status: "PENDING",
        requestedById: session.user.id,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        requestedBy: { select: { id: true, email: true } },
        approvedBy: { select: { id: true, email: true } },
      },
    });

    await tx.calendarEvent.create({
      data: {
        tenantId,
        title: `${request.employee.firstName} ${request.employee.lastName} — ${absenceTypeLabel(request.type)}`,
        startAt,
        endAt,
        allDay: true,
        type: "ABSENCE",
        employeeId: request.employeeId,
        absenceId: request.id,
      },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "absence.create",
      resourceType: "absenceRequest",
      resourceId: request.id,
      metadata: { type: request.type, startAt, endAt },
    });

    revalidatePath("/dashboard/modules/absences");
    revalidatePath("/dashboard/modules/calendar");
    return { success: true, request };
  });
}

export async function updateAbsenceRequest(
  id: string,
  data: Partial<AbsenceInput>
): Promise<
  | { success: true; request: AbsenceRequestRecord }
  | { success: false; error: string }
> {
  const { tenantId, session } = await requirePermission("absences:create");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.absenceRequest.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        requestedBy: { select: { id: true, email: true } },
        approvedBy: { select: { id: true, email: true } },
      },
    });
    if (!existing || existing.tenantId !== tenantId) {
      return { success: false, error: "Antrag nicht gefunden" };
    }
    if (existing.status !== "PENDING") {
      return { success: false, error: "Nur ausstehende Anträge können bearbeitet werden" };
    }

    const update: Prisma.AbsenceRequestUpdateInput = {};
    if (data.type !== undefined) update.type = data.type;
    if (data.startAt !== undefined) update.startAt = new Date(data.startAt);
    if (data.endAt !== undefined) update.endAt = new Date(data.endAt);
    if (data.notes !== undefined) update.notes = data.notes ?? null;

    const request = await tx.absenceRequest.update({
      where: { id },
      data: update,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        requestedBy: { select: { id: true, email: true } },
        approvedBy: { select: { id: true, email: true } },
      },
    });

    await tx.calendarEvent.updateMany({
      where: { absenceId: id },
      data: {
        startAt: request.startAt,
        endAt: request.endAt,
        title: `${request.employee.firstName} ${request.employee.lastName} — ${absenceTypeLabel(request.type)}`,
      },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "absence.update",
      resourceType: "absenceRequest",
      resourceId: request.id,
      metadata: { type: request.type },
    });

    revalidatePath("/dashboard/modules/absences");
    revalidatePath("/dashboard/modules/calendar");
    return { success: true, request };
  });
}

export async function approveAbsenceRequest(
  id: string,
  decision: "APPROVED" | "REJECTED"
): Promise<
  | { success: true; request: AbsenceRequestRecord }
  | { success: false; error: string }
> {
  const { tenantId, session } = await requirePermission("absences:approve");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.absenceRequest.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true, vacationDays: true } },
      },
    });
    if (!existing || existing.tenantId !== tenantId) {
      return { success: false, error: "Antrag nicht gefunden" };
    }
    if (existing.status !== "PENDING") {
      return { success: false, error: "Antrag wurde bereits bearbeitet" };
    }

    const approvedAt = decision === "APPROVED" ? new Date() : null;
    const request = await tx.absenceRequest.update({
      where: { id },
      data: { status: decision, approvedById: session.user.id, approvedAt },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        requestedBy: { select: { id: true, email: true } },
        approvedBy: { select: { id: true, email: true } },
      },
    });

    if (decision === "APPROVED" && request.type === "VACATION" && request.employee.vacationDays != null) {
      const days = businessDays(request.startAt, request.endAt);
      await tx.employee.update({
        where: { id: request.employeeId },
        data: { vacationDays: { decrement: days } },
      });
    }

    await tx.calendarEvent.updateMany({
      where: { absenceId: id },
      data: { type: decision === "APPROVED" ? "ABSENCE" : "WORK" },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: decision === "APPROVED" ? "absence.approve" : "absence.reject",
      resourceType: "absenceRequest",
      resourceId: request.id,
      metadata: { type: request.type },
    });

    revalidatePath("/dashboard/modules/absences");
    revalidatePath("/dashboard/modules/calendar");
    return { success: true, request };
  });
}

export async function cancelAbsenceRequest(
  id: string
): Promise<{ success: true; request: AbsenceRequestRecord } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("absences:delete");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.absenceRequest.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true, vacationDays: true } },
      },
    });
    if (!existing || existing.tenantId !== tenantId) {
      return { success: false, error: "Antrag nicht gefunden" };
    }
    if (existing.status === "CANCELLED") {
      return { success: false, error: "Antrag bereits storniert" };
    }

    const request = await tx.absenceRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        requestedBy: { select: { id: true, email: true } },
        approvedBy: { select: { id: true, email: true } },
      },
    });

    if (existing.status === "APPROVED" && existing.type === "VACATION" && request.employee.vacationDays != null) {
      const days = businessDays(existing.startAt, existing.endAt);
      await tx.employee.update({
        where: { id: request.employeeId },
        data: { vacationDays: { increment: days } },
      });
    }

    await tx.calendarEvent.deleteMany({ where: { absenceId: id } });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "absence.cancel",
      resourceType: "absenceRequest",
      resourceId: request.id,
      metadata: { type: request.type },
    });

    revalidatePath("/dashboard/modules/absences");
    revalidatePath("/dashboard/modules/calendar");
    return { success: true, request };
  });
}

export function absenceTypeLabel(type: string) {
  const labels: Record<string, string> = {
    VACATION: "Urlaub",
    SICK: "Krank",
    PARENTAL: "Elternzeit",
    UNPAID: "Unbezahlt",
    OTHER: "Sonstiges",
  };
  return labels[type] || type;
}

export function absenceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Ausstehend",
    APPROVED: "Genehmigt",
    REJECTED: "Abgelehnt",
    CANCELLED: "Storniert",
  };
  return labels[status] || status;
}

export function vacationDaysUsed(requests: { startAt: Date; endAt: Date; status: string; type: string }[]) {
  return requests
    .filter((r) => r.status === "APPROVED" && r.type === "VACATION")
    .reduce((sum, r) => sum + businessDays(r.startAt, r.endAt), 0);
}
