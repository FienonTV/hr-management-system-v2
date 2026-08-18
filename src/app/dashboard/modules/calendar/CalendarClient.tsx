"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogContent } from "@/components/ui/dialog";
import type { AggregatedCalendarEvent, CalendarEventType } from "@/lib/actions/calendarAggregated";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/actions/calendar";

const eventTypeLabels: Record<CalendarEventType, string> = {
  BIRTHDAY: "Geburtstag",
  DOCUMENT_EXPIRY: "Dokument läuft ab",
  QUALIFICATION_EXPIRY: "Qualifikation läuft ab",
  PROJECT_START: "Projektstart",
  PROJECT_END: "Projektende",
  MILESTONE: "Meilenstein",
  ABSENCE: "Abwesenheit",
  MEETING: "Besprechung",
  HOLIDAY: "Feiertag",
  CUSTOM: "Sonstiger Termin",
};

const eventTypeColors: Record<CalendarEventType, string> = {
  BIRTHDAY: "bg-blue-100 text-blue-700 border-blue-300",
  DOCUMENT_EXPIRY: "bg-red-100 text-red-700 border-red-300",
  QUALIFICATION_EXPIRY: "bg-orange-100 text-orange-700 border-orange-300",
  PROJECT_START: "bg-indigo-100 text-indigo-700 border-indigo-300",
  PROJECT_END: "bg-purple-100 text-purple-700 border-purple-300",
  MILESTONE: "bg-cyan-100 text-cyan-700 border-cyan-300",
  ABSENCE: "bg-green-100 text-green-700 border-green-300",
  MEETING: "bg-yellow-100 text-yellow-700 border-yellow-300",
  HOLIDAY: "bg-gray-100 text-gray-700 border-gray-300",
  CUSTOM: "bg-pink-100 text-pink-700 border-pink-300",
};

type ViewMode = "month" | "week" | "day" | "agenda";

export default function CalendarClient({
  initialEvents,
  employees,
}: {
  initialEvents: AggregatedCalendarEvent[];
  employees: { id: string; firstName: string; lastName: string }[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [selectedEvent, setSelectedEvent] = useState<AggregatedCalendarEvent | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [filterTypes, setFilterTypes] = useState<CalendarEventType[]>([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    startAt: "",
    endAt: "",
    allDay: true,
    type: "CUSTOM" as CalendarEventType,
    employeeId: "",
  });

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filterTypes.length > 0 && !filterTypes.includes(e.type)) return false;
      if (filterEmployeeId && e.employeeId !== filterEmployeeId) return false;
      return true;
    });
  }, [events, filterTypes, filterEmployeeId]);

  const visibleEvents = useMemo(() => {
    const start = rangeStart(currentDate, view);
    const end = rangeEnd(currentDate, view);
    return filteredEvents.filter((e) => e.startAt <= end && e.endAt >= start);
  }, [filteredEvents, currentDate, view]);

  const days = useMemo(() => {
    if (view === "day") return [new Date(currentDate)];
    const start = rangeStart(currentDate, view);
    const count = view === "week" ? 7 : daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    return Array.from({ length: count }, (_, i) => addDays(start, i));
  }, [currentDate, view]);

  function prev() {
    setCurrentDate((d) => addMonths(d, view === "day" ? 0 : view === "week" ? 0 : -1));
    if (view === "week") setCurrentDate((d) => addDays(d, -7));
    if (view === "day") setCurrentDate((d) => addDays(d, -1));
  }

  function next() {
    setCurrentDate((d) => addMonths(d, view === "day" ? 0 : view === "week" ? 0 : 1));
    if (view === "week") setCurrentDate((d) => addDays(d, 7));
    if (view === "day") setCurrentDate((d) => addDays(d, 1));
  }

  function today() {
    setCurrentDate(new Date());
  }

  function openCreate() {
    const dateStr = toInputDate(currentDate);
    setForm({ title: "", description: "", startAt: dateStr, endAt: dateStr, allDay: true, type: "CUSTOM", employeeId: "" });
    setShowManualForm(true);
  }

  function openEdit(event: AggregatedCalendarEvent) {
    if (!event.isManual) {
      setSelectedEvent(event);
      return;
    }
    setForm({
      title: event.title,
      description: event.description || "",
      startAt: toInputDateTime(event.startAt),
      endAt: toInputDateTime(event.endAt),
      allDay: event.allDay,
      type: event.type,
      employeeId: event.employeeId || "",
    });
    setSelectedEvent(event);
    setShowManualForm(true);
  }

  async function saveManual() {
    setIsLoading(true);
    const start = new Date(form.startAt);
    const end = new Date(form.endAt);
    if (form.allDay) {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }
    const data = {
      title: form.title,
      description: form.description || undefined,
      startAt: start,
      endAt: end,
      allDay: form.allDay,
      type: form.type as "WORK" | "ABSENCE" | "MEETING" | "HOLIDAY",
      employeeId: form.employeeId || null,
    };

    if (selectedEvent?.isManual) {
      await updateCalendarEvent(selectedEvent.id, data);
    } else {
      await createCalendarEvent(data);
    }
    setShowManualForm(false);
    setSelectedEvent(null);
    window.location.reload();
  }

  async function removeManual() {
    if (!selectedEvent?.isManual) return;
    setIsLoading(true);
    await deleteCalendarEvent(selectedEvent.id);
    setShowManualForm(false);
    setSelectedEvent(null);
    window.location.reload();
  }

  function toggleFilterType(type: CalendarEventType) {
    setFilterTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={prev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={today}>
            Heute
          </Button>
          <Button variant="outline" onClick={next}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold text-gray-900 ml-2">
            {view === "day" ? formatDate(currentDate) : formatMonthYear(currentDate)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(["month", "week", "day", "agenda"] as ViewMode[]).map((v) => (
            <Button key={v} variant={view === v ? "default" : "outline"} onClick={() => setView(v)}>
              {v === "month" ? "Monat" : v === "week" ? "Woche" : v === "day" ? "Tag" : "Liste"}
            </Button>
          ))}
          <Button onClick={openCreate}>+ Termin</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(eventTypeLabels) as CalendarEventType[]).map((type) => (
              <button
                key={type}
                onClick={() => toggleFilterType(type)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  filterTypes.includes(type) ? eventTypeColors[type] : "bg-white text-gray-600 border-gray-300"
                }`}
              >
                {eventTypeLabels[type]}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-3">
            <div>
              <Label className="text-xs">Mitarbeiter</Label>
              <select
                className="mt-1 block w-48 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
              >
                <option value="">Alle</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.lastName}, {e.firstName}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="outline" onClick={() => { setFilterTypes([]); setFilterEmployeeId(""); }}>
              Filter zurücksetzen
            </Button>
          </div>
        </CardContent>
      </Card>

      {view === "agenda" ? (
        <AgendaView events={visibleEvents} onSelect={setSelectedEvent} />
      ) : (
        <GridView days={days} events={visibleEvents} onSelect={openEdit} view={view} />
      )}

      <Dialog open={!!selectedEvent && !showManualForm} onOpenChange={() => setSelectedEvent(null)}>
        {selectedEvent && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
              <DialogDescription>
                {eventTypeLabels[selectedEvent.type]} · {formatDate(selectedEvent.startAt)}
                {selectedEvent.endAt.getTime() !== selectedEvent.startAt.getTime() && ` – ${formatDate(selectedEvent.endAt)}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm text-gray-700">
              {selectedEvent.employeeName && <p>Mitarbeiter: {selectedEvent.employeeName}</p>}
              {selectedEvent.projectName && <p>Projekt: {selectedEvent.projectName}</p>}
              {selectedEvent.description && <p>{selectedEvent.description}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedEvent(null)}>Schließen</Button>
              {selectedEvent.sourceHref && (
                <Link href={selectedEvent.sourceHref}>
                  <Button>Zur Quelle</Button>
                </Link>
              )}
              {selectedEvent.isManual && (
                <Button variant="outline" onClick={() => setShowManualForm(true)}>Bearbeiten</Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={showManualForm} onOpenChange={setShowManualForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.isManual ? "Termin bearbeiten" : "Termin erstellen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titel</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
              </div>
              <div>
                <Label>Ende</Label>
                <Input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allDay"
                checked={form.allDay}
                onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
              />
              <Label htmlFor="allDay">Ganztägig</Label>
            </div>
            <div>
              <Label>Typ</Label>
              <select
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CalendarEventType })}
              >
                <option value="CUSTOM">Sonstiger Termin</option>
                <option value="MEETING">Besprechung</option>
                <option value="HOLIDAY">Feiertag</option>
              </select>
            </div>
            <div>
              <Label>Mitarbeiter (optional)</Label>
              <select
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              >
                <option value="">Keiner</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.lastName}, {e.firstName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            {selectedEvent?.isManual && (
              <Button variant="destructive" onClick={removeManual} disabled={isLoading}>Löschen</Button>
            )}
            <Button variant="outline" onClick={() => { setShowManualForm(false); setSelectedEvent(null); }} disabled={isLoading}>Abbrechen</Button>
            <Button onClick={saveManual} disabled={isLoading || !form.title}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GridView({
  days,
  events,
  onSelect,
  view,
}: {
  days: Date[];
  events: AggregatedCalendarEvent[];
  onSelect: (e: AggregatedCalendarEvent) => void;
  view: ViewMode;
}) {
  return (
    <div className={`grid gap-2 ${view === "day" ? "grid-cols-1" : view === "week" ? "grid-cols-7" : "grid-cols-7"}`}>
      {days.map((day) => {
        const dayEvents = events.filter((e) => isSameDay(e.startAt, day) || (e.startAt <= day && e.endAt >= day));
        return (
          <div key={day.toISOString()} className="min-h-[120px] rounded-lg border border-gray-200 bg-white p-2">
            <div className="mb-1 text-sm font-semibold text-gray-700">
              {view === "month" ? day.getDate() : formatWeekday(day)}
            </div>
            <div className="space-y-1">
              {dayEvents.slice(0, view === "month" ? 3 : 20).map((event) => (
                <button
                  key={event.id}
                  onClick={() => onSelect(event)}
                  className={`block w-full truncate rounded border px-2 py-1 text-left text-xs ${eventTypeColors[event.type]}`}
                  title={event.title}
                >
                  {!event.allDay && `${pad(event.startAt.getHours())}:${pad(event.startAt.getMinutes())} `}
                  {event.title}
                </button>
              ))}
              {view === "month" && dayEvents.length > 3 && (
                <div className="text-xs text-gray-500">+{dayEvents.length - 3} weitere</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgendaView({ events, onSelect }: { events: AggregatedCalendarEvent[]; onSelect: (e: AggregatedCalendarEvent) => void }) {
  return (
    <div className="space-y-2">
      {events.length === 0 && <p className="text-sm text-gray-500">Keine Termine im gewählten Zeitraum.</p>}
      {events.map((event) => (
        <button
          key={event.id}
          onClick={() => onSelect(event)}
          className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition hover:opacity-80 ${eventTypeColors[event.type]}`}
        >
          <div>
            <p className="font-medium">{event.title}</p>
            <p className="text-xs opacity-90">
              {event.employeeName} {event.projectName && `· ${event.projectName}`}
            </p>
          </div>
          <div className="text-right text-xs">
            <p>{formatDate(event.startAt)}</p>
            {event.endAt.getTime() !== event.startAt.getTime() && <p>– {formatDate(event.endAt)}</p>}
          </div>
        </button>
      ))}
    </div>
  );
}

function rangeStart(date: Date, view: ViewMode): Date {
  if (view === "month") return new Date(date.getFullYear(), date.getMonth(), 1);
  if (view === "week") {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(date.setHours(0, 0, 0, 0));
}

function rangeEnd(date: Date, view: ViewMode): Date {
  if (view === "month") return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  if (view === "week") {
    const start = rangeStart(date, "week");
    return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000 + 999);
  }
  return new Date(date.setHours(23, 59, 59, 999));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

function formatWeekday(date: Date): string {
  return date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toInputDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toInputDateTime(date: Date): string {
  return `${toInputDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
