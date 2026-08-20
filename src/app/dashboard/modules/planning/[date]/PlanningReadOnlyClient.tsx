"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Printer, AlertTriangle, Car, Clock, MapPin, Building2 } from "lucide-react";
import type { DailyPlanWithSites } from "@/lib/actions/planning";
import type { Employee, Vehicle, Project } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────────

type PlanningEmployee = Omit<Employee, "hourlyWage"> & {
  hourlyWage?: number | null;
  department: { id: string; name: string } | null;
};

// ─── Helpers ───────────────────────────────────────────────────────

function getWeekdayDE(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", { weekday: "long" });
}

function getCalendarWeek(dateStr: string): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// ─── Component ─────────────────────────────────────────────────────

interface PlanningReadOnlyClientProps {
  date: string;
  initialPlan: DailyPlanWithSites | null;
  isTemplate: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  employees: PlanningEmployee[];
  vehicles: Vehicle[];
  projects: Project[];
  settings: {
    defaultStartTime: string;
    defaultEndTime: string;
    autoCarryOver: boolean;
    weekendMode: "none" | "saturday" | "both";
    poolDepartmentIds: string[];
  };
}

export default function PlanningReadOnlyClient({
  date,
  initialPlan,
  isTemplate,
  isHoliday,
  holidayName,
  employees,
  vehicles,
  projects,
  settings,
}: PlanningReadOnlyClientProps) {
  const prevDate = getAdjacentDate(date, -1);
  const nextDate = getAdjacentDate(date, 1);

  const sites = useMemo(() => {
    if (!initialPlan) return [];
    return initialPlan.sites.map((s) => ({
      id: s.id,
      name: s.name || s.project?.name || "Baustelle",
      location: s.location || "",
      startTime: s.startTime || settings.defaultStartTime,
      endTime: s.endTime || settings.defaultEndTime,
      vehiclePlates: s.vehiclePlates || [],
      sortOrder: s.sortOrder,
      assignments: s.assignments.map((a) => ({
        employeeId: a.employeeId || "",
        employee: a.employee,
        note: a.notes,
      })),
    }));
  }, [initialPlan, settings.defaultStartTime, settings.defaultEndTime]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Tagesplanung — {getWeekdayDE(date)}, {new Date(date).toLocaleDateString("de-DE")}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Kalenderwoche {getCalendarWeek(date)} {isTemplate && "· Vorlage aus Vortag"} {isHoliday && holidayName ? `· Feiertag: ${holidayName}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`/dashboard/modules/planning/${prevDate}`}
              className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Vortag
            </a>
            <a
              href={`/dashboard/modules/planning/${nextDate}`}
              className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Nachtag <ChevronRight className="ml-1 h-4 w-4" />
            </a>
            <a
              href={`/dashboard/modules/planning/${date}?export=pdf`}
              className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Printer className="mr-1 h-4 w-4" /> PDF
            </a>
          </div>
        </div>

        {isHoliday && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            <span>Feiertag: {holidayName}. Es ist keine aktive Planung vorgesehen.</span>
          </div>
        )}

        {sites.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
            Für diesen Tag ist noch keine Einsatzplanung vorhanden.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sites.map((site, idx) => (
              <div key={site.id || idx} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{site.name}</h3>
                      {site.location && (
                        <p className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="h-3.5 w-3.5" /> {site.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" /> {site.startTime} – {site.endTime}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-gray-700">Mitarbeiter</h4>
                    {site.assignments.length === 0 ? (
                      <p className="text-sm text-gray-400">Keine Mitarbeiter zugeordnet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {site.assignments.map((a, i) => (
                          <li key={i} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm">
                            <span className="font-medium text-gray-900">
                              {a.employee?.firstName} {a.employee?.lastName}
                            </span>
                            {a.note && <span className="text-gray-500">{a.note}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-medium text-gray-700">Fahrzeuge</h4>
                    {site.vehiclePlates.length === 0 ? (
                      <p className="text-sm text-gray-400">Keine Fahrzeuge zugeordnet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {site.vehiclePlates.map((plate, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-700">
                            <Car className="h-3.5 w-3.5" /> {plate}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getAdjacentDate(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().split("T")[0];
}
