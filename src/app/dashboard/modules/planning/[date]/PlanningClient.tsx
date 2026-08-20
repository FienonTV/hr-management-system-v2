"use client";

import { useState, useCallback, useMemo, Fragment, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Pencil,
  Check,
  Trash2,
  Printer,
  AlertTriangle,
  Car,
  Clock,
  MapPin,
  RotateCcw,
  Building2,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveDailyPlan, deleteDailyPlan, savePlanningSettings } from "@/lib/actions/planning";
import { nextWorkingDay, isWeekend, formatDateDE, formatTime } from "@/lib/planningUtils";
import type { DailyPlanWithSites } from "@/lib/actions/planning";
import type { Employee, Vehicle, Project, Department } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────────

type PlanningEmployee = Omit<Employee, "hourlyWage"> & {
  hourlyWage?: number | null;
  department: { id: string; name: string } | null;
};

type PlanSite = {
  _tempId?: string;
  id?: string;
  name: string;
  location?: string;
  vehiclePlates: string[];
  startTime: string;
  endTime: string;
  sortOrder: number;
  assignments: Assignment[];
  projectId?: string;
  isEditing?: boolean;
};

type Assignment = {
  employeeId: string;
  employee: PlanningEmployee;
  note?: string | null;
};

// ─── Helpers ───────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

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

let tempIdCounter = 0;
function newTempId() {
  return `temp-${++tempIdCounter}`;
}

// ─── Component ─────────────────────────────────────────────────────

interface PlanningClientProps {
  date: string;
  initialPlan: DailyPlanWithSites | null;
  isTemplate: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  employees: PlanningEmployee[];
  vehicles: Vehicle[];
  projects: Project[];
  departments: Array<{ id: string; name: string }>;
  settings: {
    defaultStartTime: string;
    defaultEndTime: string;
    autoCarryOver: boolean;
    weekendMode: "none" | "saturday" | "both";
    poolDepartmentIds: string[];
  };
}

export default function PlanningClient({
  date,
  initialPlan,
  isTemplate: initialTemplate,
  isHoliday,
  holidayName,
  employees,
  vehicles,
  projects,
  settings,
}: PlanningClientProps) {
  const router = useRouter();

  const initialSites = useMemo<PlanSite[]>(() => {
    if (!initialPlan) return [];
    return initialPlan.sites.map((s, i) => ({
      id: s.id,
      projectId: s.projectId || undefined,
      name: s.name || s.project?.name || "Baustelle",
      location: s.location || "",
      startTime: s.startTime || settings.defaultStartTime,
      endTime: s.endTime || settings.defaultEndTime,
      vehiclePlates: s.vehiclePlates || [],
      sortOrder: s.sortOrder ?? i,
      assignments: s.assignments.map((a) => ({
        employeeId: a.employeeId || "",
        employee: a.employee as PlanningEmployee,
        note: a.notes,
      })),
    }));
  }, [initialPlan, settings.defaultStartTime, settings.defaultEndTime]);

  const [sites, setSites] = useState<PlanSite[]>(initialSites);
  const [isTemplate, setIsTemplate] = useState(initialTemplate);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ ...settings });

  const [draggingEmployee, setDraggingEmployee] = useState<PlanningEmployee | null>(null);
  const [draggingFromSiteIdx, setDraggingFromSiteIdx] = useState<number | null>(null);
  const [dragOverSiteIdx, setDragOverSiteIdx] = useState<number | null>(null);

  const [draggingVehicle, setDraggingVehicle] = useState<Vehicle | null>(null);
  const [draggingVehicleFromSiteIdx, setDraggingVehicleFromSiteIdx] = useState<number | null>(null);

  const [draggingPlanSiteIdx, setDraggingPlanSiteIdx] = useState<number | null>(null);
  const [dropInsertIdx, setDropInsertIdx] = useState<number | null>(null);
  const [draggingWorkSite, setDraggingWorkSite] = useState<Vehicle | Project | null>(null);

  const [editingNote, setEditingNote] = useState<{ siteIdx: number; empIdx: number } | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const [editingSite, setEditingSite] = useState<number | null>(null);

  const siteCardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const isWeekendDay = isWeekend(date, settings.weekendMode);

  const saveToServer = useCallback(async (updatedSites: PlanSite[]) => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveDailyPlan({
        date,
        status: "DRAFT",
        sites: updatedSites.map((s, i) => ({
          projectId: s.projectId,
          name: s.name,
          location: s.location,
          startTime: s.startTime,
          endTime: s.endTime,
          vehiclePlates: s.vehiclePlates,
          sortOrder: i,
          notes: undefined,
          assignments: s.assignments.map((a) => ({
            employeeId: a.employeeId,
            startAt: s.startTime,
            endAt: s.endTime,
            notes: a.note || undefined,
          })),
        })),
      });
      if ("success" in result && result.success === true) {
        setIsTemplate(false);
        setMessage("Gespeichert.");
      } else {
        setMessage("Speichern fehlgeschlagen.");
      }
    } catch (e) {
      setMessage("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }, [date]);

  const assignEmployee = useCallback((employee: PlanningEmployee, siteIdx: number) => {
    setSites((prev) => {
      if (prev[siteIdx].assignments.some((a) => a.employeeId === employee.id)) return prev;
      const next = [...prev];
      next[siteIdx] = { ...next[siteIdx], assignments: [...next[siteIdx].assignments, { employeeId: employee.id, employee }] };
      return next;
    });
  }, []);

  const moveEmployee = useCallback((employee: PlanningEmployee, fromIdx: number, toIdx: number) => {
    setSites((prev) => {
      const next = [...prev];
      next[fromIdx] = { ...next[fromIdx], assignments: next[fromIdx].assignments.filter((a) => a.employeeId !== employee.id) };
      if (!next[toIdx].assignments.some((a) => a.employeeId === employee.id)) {
        next[toIdx] = { ...next[toIdx], assignments: [...next[toIdx].assignments, { employeeId: employee.id, employee }] };
      }
      return next;
    });
  }, []);

  const removeAssignment = useCallback((siteIdx: number, employeeId: string) => {
    setSites((prev) => {
      const next = [...prev];
      next[siteIdx] = { ...next[siteIdx], assignments: next[siteIdx].assignments.filter((a) => a.employeeId !== employeeId) };
      return next;
    });
  }, []);

  const assignVehicle = useCallback((vehicle: Vehicle, siteIdx: number) => {
    setSites((prev) => {
      if (prev[siteIdx].vehiclePlates.includes(vehicle.licensePlate || vehicle.name)) return prev;
      const plate = vehicle.licensePlate || vehicle.name;
      const next = [...prev];
      next[siteIdx] = { ...next[siteIdx], vehiclePlates: [...next[siteIdx].vehiclePlates, plate] };
      return next;
    });
  }, []);

  const moveVehicle = useCallback((vehicle: Vehicle, fromIdx: number, toIdx: number) => {
    const plate = vehicle.licensePlate || vehicle.name;
    setSites((prev) => {
      const next = [...prev];
      next[fromIdx] = { ...next[fromIdx], vehiclePlates: next[fromIdx].vehiclePlates.filter((p) => p !== plate) };
      if (!next[toIdx].vehiclePlates.includes(plate)) {
        next[toIdx] = { ...next[toIdx], vehiclePlates: [...next[toIdx].vehiclePlates, plate] };
      }
      return next;
    });
  }, []);

  const removeVehicleFromSite = useCallback((siteIdx: number, plate: string) => {
    setSites((prev) => {
      const next = [...prev];
      next[siteIdx] = { ...next[siteIdx], vehiclePlates: next[siteIdx].vehiclePlates.filter((p) => p !== plate) };
      return next;
    });
  }, []);

  const addSiteFromProject = useCallback((project: Project, insertIdx: number) => {
    setSites((prev) => {
      const newSite: PlanSite = {
        _tempId: newTempId(),
        projectId: project.id,
        name: project.name,
        location: (project as any).location || "",
        startTime: settings.defaultStartTime,
        endTime: settings.defaultEndTime,
        vehiclePlates: [],
        sortOrder: insertIdx,
        assignments: [],
      };
      const next = [...prev];
      next.splice(insertIdx, 0, newSite);
      return next.map((s, i) => ({ ...s, sortOrder: i }));
    });
  }, [settings.defaultStartTime, settings.defaultEndTime]);

  const removeSite = useCallback((siteIdx: number) => {
    setSites((prev) => prev.filter((_, i) => i !== siteIdx).map((s, i) => ({ ...s, sortOrder: i })));
  }, []);

  const reorderSite = useCallback((fromIdx: number, toIdx: number) => {
    setSites((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next.map((s, i) => ({ ...s, sortOrder: i }));
    });
  }, []);

  const updateSiteField = useCallback((siteIdx: number, field: keyof PlanSite, value: string) => {
    setSites((prev) => {
      const next = [...prev];
      next[siteIdx] = { ...next[siteIdx], [field]: value };
      return next;
    });
  }, []);

  const addManualSite = useCallback(() => {
    const tempId = newTempId();
    setSites((prev) => {
      const newSite: PlanSite = {
        _tempId: tempId,
        name: "Neue Baustelle",
        location: "",
        startTime: settings.defaultStartTime,
        endTime: settings.defaultEndTime,
        vehiclePlates: [],
        sortOrder: prev.length,
        assignments: [],
        isEditing: true,
      };
      const next = [...prev, newSite];
      setEditingSite(next.length - 1);
      return next;
    });
  }, [settings.defaultStartTime, settings.defaultEndTime]);

  const navigateDate = (delta: number) => {
    router.push(`/dashboard/modules/planning/${nextWorkingDay(date, delta, settings.weekendMode)}`);
  };

  const saveNote = useCallback(() => {
    if (!editingNote) return;
    setSites((prev) => {
      const next = [...prev];
      const assignments = [...next[editingNote.siteIdx].assignments];
      assignments[editingNote.empIdx] = { ...assignments[editingNote.empIdx], note: noteValue };
      next[editingNote.siteIdx] = { ...next[editingNote.siteIdx], assignments };
      return next;
    });
    setEditingNote(null);
  }, [editingNote, noteValue]);

  const availableEmployees = useMemo(() => {
    const assignedIds = new Set(sites.flatMap((s) => s.assignments.map((a) => a.employeeId)));
    return employees.filter((e) => !assignedIds.has(e.id));
  }, [employees, sites]);

  return (
    <div className="space-y-4 p-4">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area { visibility: visible !important; position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 20px; font-size: 11px; background: white; }
          #print-area * { visibility: visible !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigateDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={date}
            onChange={(e) => router.push(`/dashboard/modules/planning/${e.target.value}`)}
            className="w-40"
          />
          <Button variant="outline" onClick={() => navigateDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900">
            Tagesplanung – {getWeekdayDE(date)}, {formatDateDE(date)}
          </h1>
          {date === todayStr() && (
            <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">Heute</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {saving && <span className="text-xs text-gray-400">Speichert…</span>}
          {message && !saving && <span className="text-xs text-green-600 font-medium">{message}</span>}
          <Button variant="outline" onClick={() => setSites((prev) => prev.map((s) => ({ ...s, assignments: [] })))}>
            <RotateCcw className="mr-1 h-4 w-4" />
            Mitarbeiter zurücksetzen
          </Button>
          <Button variant="outline" onClick={() => setSites((prev) => prev.map((s) => ({ ...s, vehiclePlates: [] })))}>
            <RotateCcw className="mr-1 h-4 w-4" />
            Fahrzeuge zurücksetzen
          </Button>
          <Button variant="outline" onClick={() => setSites([])}>
            <RotateCcw className="mr-1 h-4 w-4" />
            Komplett zurücksetzen
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" />
            Drucken
          </Button>
          <Button onClick={() => saveToServer(sites)} disabled={isLoading || isHoliday || isWeekendDay}>
            Speichern
          </Button>
          <Button variant="outline" onClick={() => setShowSettings((s) => !s)}>
            Einstellungen
          </Button>
        </div>
      </div>

      {isHoliday && (
        <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Feiertag{holidayName ? `: ${holidayName}` : ""}
        </div>
      )}

      {isTemplate && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Vorlage vom letzten Arbeitstag geladen – Speichern übernimmt den Plan für heute.
        </div>
      )}

      {showSettings && (
        <div className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
          <h2 className="font-semibold">Planungseinstellungen</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Standard Beginn</label>
              <Input type="time" value={settingsForm.defaultStartTime} onChange={(e) => setSettingsForm((s) => ({ ...s, defaultStartTime: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Standard Ende</label>
              <Input type="time" value={settingsForm.defaultEndTime} onChange={(e) => setSettingsForm((s) => ({ ...s, defaultEndTime: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Wochenendmodus</label>
              <select
                value={settingsForm.weekendMode}
                onChange={(e) => setSettingsForm((s) => ({ ...s, weekendMode: e.target.value as any }))}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="both">Sa + So auslassen</option>
                <option value="saturday">Nur Sonntag auslassen</option>
                <option value="none">Keine Auslassung</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settingsForm.autoCarryOver} onChange={(e) => setSettingsForm((s) => ({ ...s, autoCarryOver: e.target.checked }))} />
                Vortags-Übernahme
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={async () => {
              const result = await savePlanningSettings(settingsForm);
              setMessage(result.success ? "Einstellungen gespeichert." : "Fehler beim Speichern.");
              if (result.success) setShowSettings(false);
            }}>Speichern</Button>
            <Button variant="outline" onClick={() => setShowSettings(false)}>Abbrechen</Button>
          </div>
        </div>
      )}

      <div className="flex gap-4 items-start">
        {/* Left: Sites */}
        <div
          className="flex-1 space-y-4"
          onDragOver={(e) => {
            if (draggingPlanSiteIdx === null && !draggingWorkSite) return;
            e.preventDefault();
            let newInsert = sites.length;
            for (let i = 0; i < sites.length; i++) {
              const el = siteCardRefs.current[i];
              if (!el) continue;
              const rect = el.getBoundingClientRect();
              if (e.clientY < rect.top + rect.height / 2) { newInsert = i; break; }
            }
            if (newInsert !== dropInsertIdx) setDropInsertIdx(newInsert);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (draggingPlanSiteIdx !== null && dropInsertIdx !== null) {
              reorderSite(draggingPlanSiteIdx, dropInsertIdx);
            } else if (draggingWorkSite && "name" in draggingWorkSite && dropInsertIdx !== null) {
              addSiteFromProject(draggingWorkSite as Project, dropInsertIdx);
            }
            setDropInsertIdx(null);
            setDraggingPlanSiteIdx(null);
            setDraggingWorkSite(null);
          }}
        >
          {sites.map((site, siteIdx) => (
            <Fragment key={site._tempId ?? site.id}>
              {(draggingPlanSiteIdx !== null || (draggingWorkSite && "name" in draggingWorkSite)) && dropInsertIdx === siteIdx && draggingPlanSiteIdx !== siteIdx && (
                <div className="h-1.5 rounded-full bg-primary-400 shadow-sm" />
              )}
              <div
                ref={(el) => { siteCardRefs.current[siteIdx] = el; }}
                className={`rounded-lg border bg-white shadow-sm transition-colors ${
                  draggingPlanSiteIdx === siteIdx
                    ? "opacity-40 border-gray-200"
                    : dragOverSiteIdx === siteIdx && draggingEmployee
                    ? "border-primary-400 ring-2 ring-primary-300 bg-primary-50"
                    : dragOverSiteIdx === siteIdx && draggingVehicle
                    ? "border-amber-400 ring-2 ring-amber-300 bg-amber-50"
                    : "border-gray-200"
                }`}
                onDragOver={(e) => {
                  if ((draggingEmployee || draggingVehicle) && draggingPlanSiteIdx === null) {
                    e.preventDefault();
                    setDragOverSiteIdx(siteIdx);
                  }
                }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverSiteIdx(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverSiteIdx(null);
                  if (draggingPlanSiteIdx !== null) return;
                  if (draggingEmployee) {
                    if (draggingFromSiteIdx !== null) {
                      moveEmployee(draggingEmployee, draggingFromSiteIdx, siteIdx);
                    } else {
                      assignEmployee(draggingEmployee, siteIdx);
                    }
                    setDraggingEmployee(null);
                    setDraggingFromSiteIdx(null);
                  } else if (draggingVehicle) {
                    if (draggingVehicleFromSiteIdx !== null) {
                      moveVehicle(draggingVehicle, draggingVehicleFromSiteIdx, siteIdx);
                    } else {
                      assignVehicle(draggingVehicle, siteIdx);
                    }
                    setDraggingVehicle(null);
                    setDraggingVehicleFromSiteIdx(null);
                  }
                }}
              >
                {site.isEditing || editingSite === siteIdx ? (
                  <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3">
                    <Input value={site.name} onChange={(e) => updateSiteField(siteIdx, "name", e.target.value)} placeholder="Name" className="w-36" />
                    <Input value={site.location || ""} onChange={(e) => updateSiteField(siteIdx, "location", e.target.value)} placeholder="Ort" className="w-28" />
                    <Input type="time" value={site.startTime} onChange={(e) => updateSiteField(siteIdx, "startTime", e.target.value)} className="w-24" />
                    <span className="text-gray-400 text-sm">–</span>
                    <Input type="time" value={site.endTime} onChange={(e) => updateSiteField(siteIdx, "endTime", e.target.value)} className="w-24" />
                    <Button
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setSites((prev) => {
                          const next = [...prev];
                          next[siteIdx] = { ...next[siteIdx], isEditing: false };
                          return next;
                        });
                        setEditingSite(null);
                        saveToServer(sites.map((s, i) => (i === siteIdx ? { ...s, isEditing: false } : s)));
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      className="h-8 w-8 p-0"
                      variant="outline"
                      onClick={() => { setEditingSite(null); removeSite(siteIdx); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between border-b border-gray-100 pl-2 pr-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        draggable
                        onDragStart={(e) => { e.stopPropagation(); setDraggingPlanSiteIdx(siteIdx); }}
                        onDragEnd={() => { setDraggingPlanSiteIdx(null); setDropInsertIdx(null); }}
                        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0"
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>
                      <div className="flex flex-wrap items-center gap-3">
                        <div>
                          <span className="font-semibold text-gray-900">{site.name}</span>
                          {site.location && <span className="ml-2 text-sm text-primary-600 font-medium">{site.location}</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {site.startTime}–{site.endTime}
                        </div>
                        {site.vehiclePlates.map((plate) => (
                          <span
                            key={plate}
                            draggable
                            onDragStart={() => {
                              setDraggingVehicle({ id: "", licensePlate: plate, name: plate, tenantId: "", status: "AVAILABLE", notes: null, createdAt: new Date(), updatedAt: new Date() } as Vehicle);
                              setDraggingVehicleFromSiteIdx(siteIdx);
                              setDragOverSiteIdx(null);
                            }}
                            onDragEnd={() => { setDraggingVehicle(null); setDraggingVehicleFromSiteIdx(null); }}
                            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium cursor-grab active:cursor-grabbing bg-amber-100 text-amber-700 hover:bg-amber-200"
                          >
                            <Car className="h-3 w-3" />
                            {plate}
                            <button onClick={(e) => { e.stopPropagation(); removeVehicleFromSite(siteIdx, plate); }} className="ml-0.5 text-amber-400 hover:text-red-500">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{site.assignments.length}</span>
                      <Button className="h-8 w-8 p-0" variant="outline" onClick={() => setEditingSite(siteIdx)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button className="h-8 w-8 p-0" variant="outline" onClick={() => removeSite(siteIdx)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                )}

                {/* Assignments */}
                <div className="px-4 py-2 flex flex-wrap gap-2 min-h-[3rem]">
                  {site.assignments.map((a, empIdx) => (
                    <div key={a.employeeId} className="relative group">
                      {editingNote?.siteIdx === siteIdx && editingNote?.empIdx === empIdx ? (
                        <div className="flex items-center gap-1 rounded-full border border-primary-300 bg-primary-50 px-2 py-1">
                          <Input value={noteValue} onChange={(e) => setNoteValue(e.target.value)} placeholder="Notiz…" className="w-32 text-xs bg-transparent border-none outline-none" />
                          <Button className="h-7 w-7 p-0" onClick={saveNote}><Check className="h-3 w-3" /></Button>
                          <Button className="h-7 w-7 p-0" variant="outline" onClick={() => setEditingNote(null)}><X className="h-3 w-3" /></Button>
                        </div>
                      ) : (
                        <div
                          draggable
                          onDragStart={() => { setDraggingEmployee(a.employee); setDraggingFromSiteIdx(siteIdx); }}
                          onDragEnd={() => { setDraggingEmployee(null); setDraggingFromSiteIdx(null); setDragOverSiteIdx(null); }}
                          className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm cursor-grab active:cursor-grabbing border-gray-200 bg-gray-50 hover:border-primary-300 hover:bg-primary-50"
                          onClick={() => { setEditingNote({ siteIdx, empIdx }); setNoteValue(a.note || ""); }}
                        >
                          <span className="font-medium text-gray-800">{a.employee.firstName} {a.employee.lastName}</span>
                          {a.note && <span className="text-xs text-gray-500 italic">({a.note})</span>}
                          <button onClick={(e) => { e.stopPropagation(); removeAssignment(siteIdx, a.employeeId); }} className="text-gray-300 hover:text-red-500 ml-1">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {site.assignments.length === 0 && <span className="text-xs text-gray-400 italic">Keine Mitarbeiter zugewiesen</span>}
                </div>
              </div>
            </Fragment>
          ))}
          {sites.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
              Noch keine Baustellen. Ziehe ein aktives Projekt oder eine Fahrzeug aus dem rechten Pool hierher.
            </div>
          )}
        </div>

        {/* Right: Pools */}
        <div className="w-80 shrink-0 space-y-4">
          {/* Employees */}
          <div className="rounded-lg border bg-white shadow-sm p-3 space-y-2">
            <h3 className="font-semibold text-sm text-gray-900">Mitarbeiter-Pool</h3>
            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
              {availableEmployees.map((employee) => (
                <div
                  key={employee.id}
                  draggable
                  onDragStart={() => setDraggingEmployee(employee)}
                  onDragEnd={() => setDraggingEmployee(null)}
                  className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-sm cursor-grab active:cursor-grabbing hover:border-primary-300 hover:bg-primary-50"
                >
                  <span className="font-medium text-gray-800">{employee.firstName} {employee.lastName}</span>
                  {employee.department && <span className="text-xs text-gray-500">({employee.department.name})</span>}
                </div>
              ))}
              {availableEmployees.length === 0 && <span className="text-xs text-gray-400">Alle Mitarbeiter zugewiesen</span>}
            </div>
          </div>

          {/* Vehicles */}
          <div className="rounded-lg border bg-white shadow-sm p-3 space-y-2">
            <h3 className="font-semibold text-sm text-gray-900">Fahrzeug-Pool</h3>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  draggable
                  onDragStart={() => setDraggingVehicle(vehicle)}
                  onDragEnd={() => setDraggingVehicle(null)}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium cursor-grab active:cursor-grabbing bg-amber-100 text-amber-700 hover:bg-amber-200"
                >
                  <Car className="h-3 w-3" />
                  {vehicle.licensePlate || vehicle.name}
                </div>
              ))}
              {vehicles.length === 0 && <span className="text-xs text-gray-400">Keine Fahrzeuge</span>}
            </div>
          </div>

          {/* Projects / Baustellen */}
          <div
            className="rounded-lg border bg-white shadow-sm p-3 space-y-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
          >
            <h3 className="font-semibold text-sm text-gray-900">Baustellen-Pool</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {projects.map((project) => (
                <div
                  key={project.id}
                  draggable
                  onDragStart={() => setDraggingWorkSite(project)}
                  onDragEnd={() => setDraggingWorkSite(null)}
                  className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm cursor-grab active:cursor-grabbing hover:border-primary-300 hover:bg-primary-50"
                >
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-800">{project.name}</div>
                    {(project as any).location && <div className="text-xs text-gray-500">{(project as any).location}</div>}
                  </div>
                </div>
              ))}
              {projects.length === 0 && <span className="text-xs text-gray-400">Keine aktiven Projekte</span>}
            </div>
            <Button variant="outline" className="w-full" onClick={addManualSite}>
              <Plus className="mr-1 h-4 w-4" /> Manuelle Baustelle
            </Button>
          </div>
        </div>
      </div>

      {/* Print area */}
      <div id="print-area" className="hidden print:block">
        <h2 className="text-lg font-bold mb-2">Tagesplanung {formatDateDE(date)}</h2>
        {sites.map((site) => (
          <div key={site._tempId ?? site.id} className="mb-3 border-b pb-2">
            <div className="font-semibold">{site.name} {site.location ? `– ${site.location}` : ""}</div>
            <div className="text-xs text-gray-600">{site.startTime}–{site.endTime}</div>
            <div className="text-xs mt-1">
              Mitarbeiter: {site.assignments.map((a) => `${a.employee.firstName} ${a.employee.lastName}`).join(", ") || "–"}
            </div>
            <div className="text-xs">Fahrzeuge: {site.vehiclePlates.join(", ") || "–"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
