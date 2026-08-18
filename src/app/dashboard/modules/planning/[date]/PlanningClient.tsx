"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Trash2, GripVertical, Settings, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogContent } from "@/components/ui/dialog";
import { saveDailyPlan, deleteDailyPlan, savePlanningSettings } from "@/lib/actions/planning";
import { nextWorkingDay, isWeekend, formatDateDE, formatTime } from "@/lib/planningUtils";
import { exportPlanningPdf } from "@/lib/actions/planningExport";
import type { DailyPlanWithSites } from "@/lib/actions/planning";
import type { Employee, Vehicle, Project, Department } from "@prisma/client";

type PlanningEmployee = Employee & { department: Department | null };

type PlanningSite = {
  id?: string;
  projectId: string;
  sortOrder: number;
  notes: string;
  assignments: PlanningAssignment[];
};

type PlanningAssignment = {
  id?: string;
  employeeId?: string;
  vehicleId?: string;
  startAt?: string;
  endAt?: string;
  notes?: string;
};

export default function PlanningClient({
  date,
  initialPlan,
  isTemplate: initialIsTemplate,
  isHoliday,
  holidayName,
  employees,
  allEmployees,
  vehicles,
  settings,
  projects,
  departments,
}: {
  date: string;
  initialPlan: DailyPlanWithSites | null;
  isTemplate: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  employees: PlanningEmployee[];
  allEmployees: Employee[];
  vehicles: Vehicle[];
  settings: {
    defaultStartTime: string;
    defaultEndTime: string;
    autoCarryOver: boolean;
    weekendMode: "none" | "saturday" | "both";
    poolDepartmentIds: string[];
  };
  projects: Project[];
  departments: Department[];
}) {
  const router = useRouter();
  const [sites, setSites] = useState<PlanningSite[]>(
    initialPlan
      ? initialPlan.sites.map((s) => ({
          id: s.id,
          projectId: s.projectId,
          sortOrder: s.sortOrder,
          notes: s.notes || "",
          assignments: s.assignments.map((a) => ({
            id: a.id,
            employeeId: a.employeeId || undefined,
            vehicleId: a.vehicleId || undefined,
            startAt: a.startAt ? formatTime(a.startAt) : settings.defaultStartTime,
            endAt: a.endAt ? formatTime(a.endAt) : settings.defaultEndTime,
            notes: a.notes || "",
          })),
        }))
      : []
  );
  const [status, setStatus] = useState(initialPlan?.status || "DRAFT");
  const [isTemplate, setIsTemplate] = useState(initialIsTemplate);
  const [isLoading, setIsLoading] = useState(false);
  const [draggingSiteIdx, setDraggingSiteIdx] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ ...settings });
  const [pendingAbsences, setPendingAbsences] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const emp of allEmployees) {
      // Placeholder: real absence check would need API call per date
      map[emp.id] = "";
    }
    setPendingAbsences(map);
  }, [allEmployees, date]);

  const saveToServer = useCallback(async (updatedSites: PlanningSite[]) => {
    setIsLoading(true);
    const result = await saveDailyPlan({
      date,
      status: status as "DRAFT" | "PUBLISHED",
      sites: updatedSites,
    });
    if (result.success) {
      setSites(
        result.plan.sites.map((s) => ({
          id: s.id,
          projectId: s.projectId,
          sortOrder: s.sortOrder,
          notes: s.notes || "",
          assignments: s.assignments.map((a) => ({
            id: a.id,
            employeeId: a.employeeId || undefined,
            vehicleId: a.vehicleId || undefined,
            startAt: a.startAt ? formatTime(a.startAt) : settings.defaultStartTime,
            endAt: a.endAt ? formatTime(a.endAt) : settings.defaultEndTime,
            notes: a.notes || "",
          })),
        }))
      );
      setIsTemplate(false);
    }
    setIsLoading(false);
  }, [date, status, settings]);

  function addSite() {
    const newSite: PlanningSite = {
      projectId: projects[0]?.id || "",
      sortOrder: sites.length,
      notes: "",
      assignments: [],
    };
    const updated = [...sites, newSite];
    setSites(updated);
  }

  function removeSite(idx: number) {
    const updated = sites.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sortOrder: i }));
    setSites(updated);
  }

  function updateSite(idx: number, field: keyof PlanningSite, value: string) {
    const updated = [...sites];
    updated[idx] = { ...updated[idx], [field]: value };
    setSites(updated);
  }

  function addAssignment(siteIdx: number) {
    const updated = [...sites];
    updated[siteIdx].assignments.push({
      employeeId: employees[0]?.id,
      startAt: settings.defaultStartTime,
      endAt: settings.defaultEndTime,
      notes: "",
    });
    setSites(updated);
  }

  function updateAssignment(siteIdx: number, assignmentIdx: number, field: keyof PlanningAssignment, value: string) {
    const updated = [...sites];
    updated[siteIdx].assignments[assignmentIdx] = { ...updated[siteIdx].assignments[assignmentIdx], [field]: value };
    setSites(updated);
  }

  function removeAssignment(siteIdx: number, assignmentIdx: number) {
    const updated = [...sites];
    updated[siteIdx].assignments = updated[siteIdx].assignments.filter((_, i) => i !== assignmentIdx);
    setSites(updated);
  }

  function handleDragStart(idx: number) {
    setDraggingSiteIdx(idx);
  }

  function handleDrop(targetIdx: number) {
    if (draggingSiteIdx === null) return;
    const updated = [...sites];
    const [moved] = updated.splice(draggingSiteIdx, 1);
    updated.splice(targetIdx, 0, moved);
    setSites(updated.map((s, i) => ({ ...s, sortOrder: i })));
    setDraggingSiteIdx(null);
  }

  function prevDay() {
    router.push(`/dashboard/modules/planning/${nextWorkingDay(date, -1, settings.weekendMode)}`);
  }

  function nextDay() {
    router.push(`/dashboard/modules/planning/${nextWorkingDay(date, 1, settings.weekendMode)}`);
  }

  function today() {
    router.push(`/dashboard/modules/planning/${new Date().toISOString().split("T")[0]}`);
  }

  async function resetPlan() {
    if (!confirm("Plan für diesen Tag wirklich löschen?")) return;
    setIsLoading(true);
    await deleteDailyPlan(date);
    setSites([]);
    setStatus("DRAFT");
    setIsTemplate(false);
    setIsLoading(false);
  }

  async function saveSettings() {
    setIsLoading(true);
    await savePlanningSettings({
      defaultStartTime: settingsForm.defaultStartTime,
      defaultEndTime: settingsForm.defaultEndTime,
      autoCarryOver: settingsForm.autoCarryOver,
      weekendMode: settingsForm.weekendMode,
      poolDepartmentIds: settingsForm.poolDepartmentIds,
    });
    setShowSettings(false);
    window.location.reload();
  }

  const isWeekendDay = isWeekend(date, settings.weekendMode);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={prevDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={today}>Heute</Button>
          <Button variant="outline" onClick={nextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-xl font-bold text-gray-900">
            Einsatzplanung – {formatDateDE(date)}
          </span>
          {status === "PUBLISHED" && (
            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Freigegeben</span>
          )}
          {isTemplate && (
            <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">Vorlage vom Vortag</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="mr-1 h-4 w-4" /> Einstellungen
          </Button>
          <Button variant="outline" onClick={resetPlan} disabled={isLoading}>
            <Trash2 className="mr-1 h-4 w-4" /> Zurücksetzen
          </Button>
          <Button variant="outline" onClick={() => setStatus(status === "DRAFT" ? "PUBLISHED" : "DRAFT")}>
            {status === "DRAFT" ? "Freigeben" : "Auf Entwurf setzen"}
          </Button>
          <Button variant="outline" onClick={async () => {
            const result = await exportPlanningPdf(date);
            if (result.success) {
              const link = document.createElement("a");
              link.href = `data:application/pdf;base64,${result.pdf}`;
              link.download = `Einsatzplanung_${date}.pdf`;
              link.click();
            } else {
              alert(result.error);
            }
          }} disabled={isLoading}>
            <FileText className="mr-1 h-4 w-4" /> PDF
          </Button>
          <Button onClick={() => saveToServer(sites)} disabled={isLoading || isHoliday || isWeekendDay}>
            Speichern
          </Button>
        </div>
      </div>

      {(isHoliday || isWeekendDay) && (
        <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">
              {isHoliday ? `Feiertag: ${holidayName || "Feiertag"}` : "Wochenende"}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-4">
          {sites.length === 0 && !isHoliday && !isWeekendDay && (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                Noch keine Baustelle geplant. Klicken Sie auf „+ Baustelle“.
              </CardContent>
            </Card>
          )}

          {sites.map((site, siteIdx) => (
            <Card key={siteIdx} className={draggingSiteIdx === siteIdx ? "opacity-50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      draggable
                      onDragStart={() => handleDragStart(siteIdx)}
                      onDragEnd={() => setDraggingSiteIdx(null)}
                      className="cursor-grab"
                    >
                      <GripVertical className="h-5 w-5 text-gray-400" />
                    </button>
                    <select
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
                      value={site.projectId}
                      onChange={(e) => updateSite(siteIdx, "projectId", e.target.value)}
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button variant="outline" className="px-2" onClick={() => removeSite(siteIdx)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Notizen</Label>
                  <Input value={site.notes} onChange={(e) => updateSite(siteIdx, "notes", e.target.value)} />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Mitarbeiter / Fahrzeuge</p>
                  {site.assignments.map((assignment, assignmentIdx) => (
                    <div key={assignmentIdx} className="grid grid-cols-12 gap-2 rounded-lg border p-2">
                      <div className="col-span-3">
                        <select
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                          value={assignment.employeeId || ""}
                          onChange={(e) => updateAssignment(siteIdx, assignmentIdx, "employeeId", e.target.value)}
                        >
                          <option value="">Mitarbeiter wählen</option>
                          {employees.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.lastName}, {e.firstName}
                            </option>
                          ))}
                        </select>
                        {assignment.employeeId && pendingAbsences[assignment.employeeId] && (
                          <p className="mt-1 text-xs text-red-600">{pendingAbsences[assignment.employeeId]}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <input
                          type="time"
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                          value={assignment.startAt || settings.defaultStartTime}
                          onChange={(e) => updateAssignment(siteIdx, assignmentIdx, "startAt", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="time"
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                          value={assignment.endAt || settings.defaultEndTime}
                          onChange={(e) => updateAssignment(siteIdx, assignmentIdx, "endAt", e.target.value)}
                        />
                      </div>
                      <div className="col-span-3">
                        <select
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                          value={assignment.vehicleId || ""}
                          onChange={(e) => updateAssignment(siteIdx, assignmentIdx, "vehicleId", e.target.value)}
                        >
                          <option value="">Fahrzeug wählen</option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} {v.licensePlate ? `(${v.licensePlate})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-1">
                        <Button variant="outline" className="px-2" onClick={() => removeAssignment(siteIdx, assignmentIdx)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="px-2 py-1 text-sm" onClick={() => addAssignment(siteIdx)}>
                    <Plus className="mr-1 h-4 w-4" /> Zuordnung
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button onClick={addSite} disabled={isHoliday || isWeekendDay}>
            <Plus className="mr-1 h-4 w-4" /> Baustelle
          </Button>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mitarbeiter-Pool</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {employees.length === 0 && <p className="text-sm text-gray-500">Keine Mitarbeiter im Pool.</p>}
              {employees.map((e) => (
                <div key={e.id} className="rounded border bg-gray-50 px-3 py-2 text-sm">
                  <p className="font-medium">{e.lastName}, {e.firstName}</p>
                  {e.department && <p className="text-xs text-gray-500">{e.department.name}</p>}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Fahrzeuge</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {vehicles.length === 0 && <p className="text-sm text-gray-500">Keine Fahrzeuge verfügbar.</p>}
              {vehicles.map((v) => (
                <div key={v.id} className="rounded border bg-gray-50 px-3 py-2 text-sm">
                  <p className="font-medium">{v.name}</p>
                  {v.licensePlate && <p className="text-xs text-gray-500">{v.licensePlate}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planungseinstellungen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Standard Beginn</Label>
                <Input type="time" value={settingsForm.defaultStartTime} onChange={(e) => setSettingsForm({ ...settingsForm, defaultStartTime: e.target.value })} />
              </div>
              <div>
                <Label>Standard Ende</Label>
                <Input type="time" value={settingsForm.defaultEndTime} onChange={(e) => setSettingsForm({ ...settingsForm, defaultEndTime: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="autoCarryOver"
                type="checkbox"
                checked={settingsForm.autoCarryOver}
                onChange={(e) => setSettingsForm({ ...settingsForm, autoCarryOver: e.target.checked })}
              />
              <Label htmlFor="autoCarryOver">Vortag als Vorlage übernehmen</Label>
            </div>
            <div>
              <Label>Wochenendmodus</Label>
              <select
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={settingsForm.weekendMode}
                onChange={(e) => setSettingsForm({ ...settingsForm, weekendMode: e.target.value as any })}
              >
                <option value="none">Nur Werktage</option>
                <option value="saturday">Inkl. Samstag</option>
                <option value="both">Inkl. Samstag & Sonntag</option>
              </select>
            </div>
            <div>
              <Label>Pool-Abteilungen</Label>
              <div className="mt-1 space-y-1">
                {departments.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settingsForm.poolDepartmentIds.includes(d.id)}
                      onChange={(e) => {
                        const ids = e.target.checked
                          ? [...settingsForm.poolDepartmentIds, d.id]
                          : settingsForm.poolDepartmentIds.filter((id) => id !== d.id);
                        setSettingsForm({ ...settingsForm, poolDepartmentIds: ids });
                      }}
                    />
                    {d.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)} disabled={isLoading}>Abbrechen</Button>
            <Button onClick={saveSettings} disabled={isLoading}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

