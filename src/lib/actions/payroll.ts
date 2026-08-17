'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import type { Employee, TimeEntry } from "@prisma/client";

export async function exportPayrollCsv(
  year: number,
  month: number
): Promise<{ success: true; csv: string; filename: string } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("payroll:export");

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return withTenant(tenantId, async (tx) => {
    const employees = await tx.employee.findMany({
      where: { tenantId, status: "ACTIVE" },
      include: {
        position: { select: { name: true } },
        timeEntries: {
          where: {
            date: { gte: start, lte: end },
            status: "APPROVED",
            type: { not: "BREAK" },
          },
          select: { hours: true },
        },
        absenceRequests: {
          where: {
            startAt: { lte: end },
            endAt: { gte: start },
            status: "APPROVED",
          },
          select: { type: true, startAt: true, endAt: true },
        },
      },
    });

    const headers = [
      "Mitarbeiternummer",
      "Nachname",
      "Vorname",
      "Position",
      "Stundenlohn",
      "SummeStunden",
      "UrlaubTage",
      "KrankTage",
      "ExportMonat",
    ];

    function daysInRange(startAt: Date, endAt: Date, rangeStart: Date, rangeEnd: Date) {
      const s = startAt < rangeStart ? rangeStart : startAt;
      const e = endAt > rangeEnd ? rangeEnd : endAt;
      const ms = e.getTime() - s.getTime();
      return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
    }

    const rows = employees.map((e: any) => {
      const totalHours = e.timeEntries.reduce((sum: number, te: TimeEntry) => sum + te.hours.toNumber(), 0);
      const vacationDays = e.absenceRequests
        .filter((a: any) => a.type === "VACATION")
        .reduce((sum: number, a: any) => sum + daysInRange(a.startAt, a.endAt, start, end), 0);
      const sickDays = e.absenceRequests
        .filter((a: any) => a.type === "SICK")
        .reduce((sum: number, a: any) => sum + daysInRange(a.startAt, a.endAt, start, end), 0);

      return [
        e.employeeNumber ?? e.id,
        e.lastName,
        e.firstName,
        e.position?.name ?? "",
        e.hourlyWage?.toString() ?? "",
        totalHours.toFixed(2),
        vacationDays.toString(),
        sickDays.toString(),
        `${year}-${month.toString().padStart(2, "0")}`,
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const filename = `payroll_${year}${month.toString().padStart(2, "0")}.csv`;

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "payroll.export",
      resourceType: "payrollExport",
      resourceId: `${year}-${month}`,
      metadata: { year, month, employeeCount: employees.length },
    });

    return { success: true, csv, filename };
  });
}
