'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { absenceTypeLabel } from "@/lib/absenceUtils";
import type { CalendarEvent, AbsenceRequest, Employee, Project, ProjectMilestone, DocumentContainer, EmployeeQualification, Qualification } from "@prisma/client";

export type CalendarEventType = "BIRTHDAY" | "DOCUMENT_EXPIRY" | "QUALIFICATION_EXPIRY" | "PROJECT_START" | "PROJECT_END" | "MILESTONE" | "ABSENCE" | "MEETING" | "HOLIDAY" | "CUSTOM";

export type AggregatedCalendarEvent = {
  id: string;
  title: string;
  type: CalendarEventType;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  description?: string;
  employeeId?: string;
  employeeName?: string;
  projectId?: string;
  projectName?: string;
  sourceHref?: string;
  sourceId?: string;
  sourceType?: string;
  isManual?: boolean;
};

export type CalendarFilter = {
  startAt?: Date | string;
  endAt?: Date | string;
  employeeIds?: string[];
  types?: CalendarEventType[];
};

function toDate(value: Date | string | undefined): Date | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
}

function dateAtMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateAtEndOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export async function getCalendarAggregatedEvents(filter?: CalendarFilter): Promise<AggregatedCalendarEvent[]> {
  const { tenantId } = await requirePermission("calendar:read");
  return withTenant(tenantId, async (tx) => {
    const rangeStart = toDate(filter?.startAt) ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const rangeEnd = toDate(filter?.endAt) ?? new Date(new Date().getFullYear() + 1, new Date().getMonth() + 1, 0, 23, 59, 59, 999);

    const employeeWhere: Record<string, unknown> = { tenantId };
    if (filter?.employeeIds && filter.employeeIds.length > 0) {
      employeeWhere.id = { in: filter.employeeIds };
    }

    const [manualEvents, employees, absences, projects, milestones, documents, qualifications] = await Promise.all([
      tx.calendarEvent.findMany({
        where: { tenantId, startAt: { lte: rangeEnd }, endAt: { gte: rangeStart } },
        include: { employee: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { startAt: "asc" },
      }),
      tx.employee.findMany({
        where: employeeWhere,
        select: { id: true, firstName: true, lastName: true, birthDate: true, fixedTermEndDate: true },
      }),
      tx.absenceRequest.findMany({
        where: { tenantId, status: "APPROVED", startAt: { lte: rangeEnd }, endAt: { gte: rangeStart } },
        include: { employee: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { startAt: "asc" },
      }),
      tx.project.findMany({
        where: { tenantId, OR: [{ startDate: { not: null, gte: rangeStart, lte: rangeEnd } }, { endDate: { not: null, gte: rangeStart, lte: rangeEnd } }] },
        select: { id: true, name: true, startDate: true, endDate: true },
      }),
      tx.projectMilestone.findMany({
        where: { tenantId, status: "OPEN", plannedDate: { not: null, gte: rangeStart, lte: rangeEnd } },
        include: { project: { select: { id: true, name: true } } },
      }),
      tx.documentContainer.findMany({
        where: { tenantId, isDeleted: false, expiresAt: { not: null, gte: rangeStart, lte: rangeEnd } },
        select: { id: true, title: true, expiresAt: true, employeeId: true },
      }),
      tx.employeeQualification.findMany({
        where: { tenantId, expiresAt: { not: null, gte: rangeStart, lte: rangeEnd } },
        include: { employee: { select: { id: true, firstName: true, lastName: true } }, qualification: { select: { id: true, name: true } } },
      }),
    ]);

    const events: AggregatedCalendarEvent[] = [];

    // Manual calendar events
    for (const event of manualEvents) {
      events.push({
        id: event.id,
        title: event.title,
        type: mapEventType(event.type),
        startAt: event.startAt,
        endAt: event.endAt,
        allDay: event.allDay,
        description: event.description ?? undefined,
        employeeId: event.employeeId ?? undefined,
        employeeName: event.employee ? `${event.employee.firstName} ${event.employee.lastName}` : undefined,
        isManual: true,
      });
    }

    // Birthdays
    for (const emp of employees) {
      if (emp.birthDate) {
        const birth = new Date(emp.birthDate);
        for (let year = rangeStart.getFullYear(); year <= rangeEnd.getFullYear(); year++) {
          const candidate = new Date(year, birth.getMonth(), birth.getDate());
          if (candidate >= dateAtMidnight(rangeStart) && candidate <= dateAtEndOfDay(rangeEnd)) {
            events.push({
              id: `birthday-${emp.id}-${year}`,
              title: `Geburtstag: ${emp.firstName} ${emp.lastName}`,
              type: "BIRTHDAY",
              startAt: candidate,
              endAt: candidate,
              allDay: true,
              employeeId: emp.id,
              employeeName: `${emp.firstName} ${emp.lastName}`,
              sourceHref: `/dashboard/modules/employees/${emp.id}`,
              sourceType: "employee",
              sourceId: emp.id,
            });
          }
        }
      }
      if (emp.fixedTermEndDate) {
        const end = new Date(emp.fixedTermEndDate);
        if (end >= dateAtMidnight(rangeStart) && end <= dateAtEndOfDay(rangeEnd)) {
          events.push({
            id: `fixedterm-${emp.id}`,
            title: `Befristung endet: ${emp.firstName} ${emp.lastName}`,
            type: "CUSTOM",
            startAt: end,
            endAt: end,
            allDay: true,
            employeeId: emp.id,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            sourceHref: `/dashboard/modules/employees/${emp.id}`,
            sourceType: "employee",
            sourceId: emp.id,
          });
        }
      }
    }

    // Absences
    for (const absence of absences) {
      events.push({
        id: `absence-${absence.id}`,
        title: `${absence.employee.firstName} ${absence.employee.lastName} – ${absenceTypeLabel(absence.type)}`,
        type: "ABSENCE",
        startAt: absence.startAt,
        endAt: absence.endAt,
        allDay: true,
        employeeId: absence.employeeId,
        employeeName: `${absence.employee.firstName} ${absence.employee.lastName}`,
        sourceHref: "/dashboard/modules/absences",
        sourceType: "absence",
        sourceId: absence.id,
      });
    }

    // Project start/end
    for (const project of projects) {
      if (project.startDate) {
        events.push({
          id: `project-start-${project.id}`,
          title: `Projektstart: ${project.name}`,
          type: "PROJECT_START",
          startAt: project.startDate,
          endAt: project.startDate,
          allDay: true,
          projectId: project.id,
          projectName: project.name,
          sourceHref: `/dashboard/modules/projects/${project.id}`,
          sourceType: "project",
          sourceId: project.id,
        });
      }
      if (project.endDate) {
        events.push({
          id: `project-end-${project.id}`,
          title: `Projektende: ${project.name}`,
          type: "PROJECT_END",
          startAt: project.endDate,
          endAt: project.endDate,
          allDay: true,
          projectId: project.id,
          projectName: project.name,
          sourceHref: `/dashboard/modules/projects/${project.id}`,
          sourceType: "project",
          sourceId: project.id,
        });
      }
    }

    // Milestones
    for (const milestone of milestones) {
      if (milestone.plannedDate) {
        events.push({
          id: `milestone-${milestone.id}`,
          title: `Meilenstein: ${milestone.title} (${milestone.project.name})`,
          type: "MILESTONE",
          startAt: milestone.plannedDate,
          endAt: milestone.plannedDate,
          allDay: true,
          projectId: milestone.projectId,
          projectName: milestone.project.name,
          sourceHref: `/dashboard/modules/projects/${milestone.projectId}`,
          sourceType: "project",
          sourceId: milestone.projectId,
        });
      }
    }

    // Documents
    for (const doc of documents) {
      events.push({
        id: `doc-${doc.id}`,
        title: `Dokument läuft ab: ${doc.title}`,
        type: "DOCUMENT_EXPIRY",
        startAt: doc.expiresAt!,
        endAt: doc.expiresAt!,
        allDay: true,
        employeeId: doc.employeeId ?? undefined,
        sourceHref: doc.employeeId ? `/dashboard/modules/employees/${doc.employeeId}?tab=dokumente` : "/dashboard/modules/documents",
        sourceType: "document",
        sourceId: doc.id,
      });
    }

    // Qualifications
    for (const q of qualifications) {
      events.push({
        id: `qual-${q.id}`,
        title: `Qualifikation läuft ab: ${q.qualification.name} (${q.employee.firstName} ${q.employee.lastName})`,
        type: "QUALIFICATION_EXPIRY",
        startAt: q.expiresAt!,
        endAt: q.expiresAt!,
        allDay: true,
        employeeId: q.employeeId,
        employeeName: `${q.employee.firstName} ${q.employee.lastName}`,
        sourceHref: `/dashboard/modules/employees/${q.employeeId}?tab=qualifikationen`,
        sourceType: "employee",
        sourceId: q.employeeId,
      });
    }

    let filtered = events;
    if (filter?.types && filter.types.length > 0) {
      filtered = filtered.filter((e) => filter.types!.includes(e.type));
    }

    return filtered.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  });
}

function mapEventType(type: CalendarEvent["type"]): AggregatedCalendarEvent["type"] {
  switch (type) {
    case "ABSENCE":
      return "ABSENCE";
    case "HOLIDAY":
      return "HOLIDAY";
    case "MEETING":
      return "MEETING";
    default:
      return "CUSTOM";
  }
}

export async function getCalendarEmployees(): Promise<{ id: string; firstName: string; lastName: string }[]> {
  const { tenantId } = await requirePermission("calendar:read");
  return withTenant(tenantId, async (tx) => {
    const employees = await tx.employee.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return employees;
  });
}
