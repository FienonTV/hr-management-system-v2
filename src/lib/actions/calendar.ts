'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import type { CalendarEvent, Prisma } from "@prisma/client";

export type CalendarEventInput = {
  title: string;
  startAt: Date | string;
  endAt: Date | string;
  allDay?: boolean;
  description?: string;
  type?: "WORK" | "ABSENCE" | "MEETING" | "HOLIDAY";
  employeeId?: string | null;
};

export async function getCalendarEvents(range?: {
  startAt?: Date | string;
  endAt?: Date | string;
}): Promise<CalendarEvent[]> {
  const { tenantId } = await requirePermission("calendar:read");
  return withTenant(tenantId, async (tx) => {
    const where: Prisma.CalendarEventWhereInput = {};
    if (range?.startAt) where.startAt = { gte: new Date(range.startAt) };
    if (range?.endAt) where.endAt = { lte: new Date(range.endAt) };
    return tx.calendarEvent.findMany({
      where,
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { startAt: "asc" },
    });
  });
}

export async function createCalendarEvent(
  data: CalendarEventInput
): Promise<{ success: true; event: CalendarEvent } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("calendar:create");
  return withTenant(tenantId, async (tx) => {
    const event = await tx.calendarEvent.create({
      data: {
        ...data,
        tenantId,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        allDay: data.allDay ?? false,
        type: data.type ?? "WORK",
        employeeId: data.employeeId ?? null,
      },
    });
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "calendar.create",
      resourceType: "calendarEvent",
      resourceId: event.id,
      metadata: { title: event.title, type: event.type },
    });
    revalidatePath("/dashboard/modules/calendar");
    return { success: true, event };
  });
}

export async function updateCalendarEvent(
  id: string,
  data: Partial<CalendarEventInput>
): Promise<{ success: true; event: CalendarEvent } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("calendar:update");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.calendarEvent.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      return { success: false, error: "Kalendereintrag nicht gefunden" };
    }
    const update: Prisma.CalendarEventUpdateInput = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.startAt !== undefined) update.startAt = new Date(data.startAt);
    if (data.endAt !== undefined) update.endAt = new Date(data.endAt);
    if (data.allDay !== undefined) update.allDay = data.allDay;
    if (data.description !== undefined) update.description = data.description;
    if (data.type !== undefined) update.type = data.type;
    if (data.employeeId !== undefined) update.employeeId = data.employeeId ?? null;

    const event = await tx.calendarEvent.update({ where: { id }, data: update });
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "calendar.update",
      resourceType: "calendarEvent",
      resourceId: event.id,
      metadata: { title: event.title },
    });
    revalidatePath("/dashboard/modules/calendar");
    return { success: true, event };
  });
}

export async function deleteCalendarEvent(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("calendar:delete");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.calendarEvent.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      return { success: false, error: "Kalendereintrag nicht gefunden" };
    }
    await tx.calendarEvent.delete({ where: { id } });
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "calendar.delete",
      resourceType: "calendarEvent",
      resourceId: id,
      metadata: { title: existing.title },
    });
    revalidatePath("/dashboard/modules/calendar");
    return { success: true };
  });
}
