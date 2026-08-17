"use client";

import { useEffect, useMemo, useState } from "react";
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/actions/calendar";
import type { CalendarEvent } from "@prisma/client";
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Save } from "lucide-react";

export default function CalendarPage() {
  const [events, setEvents] = useState([] as CalendarEvent[]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null as CalendarEvent | null);
  const [form, setForm] = useState({
    title: "",
    startAt: "",
    endAt: "",
    allDay: true,
    description: "",
    type: "WORK" as CalendarEvent["type"],
  });
  const [error, setError] = useState(null as string | null);

  async function load() {
    setLoading(true);
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
    const list = await getCalendarEvents({ startAt: start, endAt: end });
    setEvents(list);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [currentDate]);

  const days = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const start = new Date(firstDay);
    start.setDate(start.getDate() - ((firstDay.getDay() + 6) % 7));
    const end = new Date(lastDay);
    end.setDate(end.getDate() + ((7 - lastDay.getDay()) % 7));
    const out = [] as Date[];
    const cur = new Date(start);
    while (cur <= end) {
      out.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [currentDate]);

  function resetForm() {
    setEditing(null);
    setForm({ title: "", startAt: "", endAt: "", allDay: true, description: "", type: "WORK" });
    setError(null);
  }

  function startEdit(event: CalendarEvent) {
    setEditing(event);
    setForm({
      title: event.title,
      startAt: new Date(event.startAt).toISOString().slice(0, 16),
      endAt: new Date(event.endAt).toISOString().slice(0, 16),
      allDay: event.allDay,
      description: event.description ?? "",
      type: event.type,
    });
    setFormOpen(true);
  }

  async function handleSave() {
    setError(null);
    const data = {
      ...form,
      startAt: new Date(form.startAt),
      endAt: new Date(form.endAt),
    };
    const res = editing
      ? await updateCalendarEvent(editing.id, data)
      : await createCalendarEvent(data);
    if (res.success) {
      resetForm();
      setFormOpen(false);
      await load();
    } else {
      setError(res.error || "Fehler beim Speichern");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Kalendereintrag wirklich löschen?")) return;
    const res = await deleteCalendarEvent(id);
    if (res.success) await load();
    else setError(res.error || "Fehler beim Löschen");
  }

  function eventsForDay(date: Date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);
    return events.filter((e) => {
      const es = new Date(e.startAt);
      const ee = new Date(e.endAt);
      return es <= end && ee >= start;
    });
  }

  const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const typeColors: Record<CalendarEvent["type"], string> = {
    WORK: "bg-blue-100 text-blue-800",
    ABSENCE: "bg-orange-100 text-orange-800",
    MEETING: "bg-purple-100 text-purple-800",
    HOLIDAY: "bg-green-100 text-green-800",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>
        <button
          onClick={() => { resetForm(); setFormOpen(true); }}
          className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> Neu
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="rounded-lg p-2 hover:bg-gray-100"><ChevronLeft className="h-5 w-5" /></button>
        <span className="text-lg font-medium text-gray-900">{currentDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</span>
        <button onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="rounded-lg p-2 hover:bg-gray-100"><ChevronRight className="h-5 w-5" /></button>
      </div>

      {formOpen && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {error && <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Titel"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CalendarEvent["type"] }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="WORK">Arbeit</option>
              <option value="ABSENCE">Abwesenheit</option>
              <option value="MEETING">Meeting</option>
              <option value="HOLIDAY">Feiertag</option>
            </select>
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Beschreibung"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 md:col-span-2"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={(e) => setForm((f) => ({ ...f, allDay: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Ganztägig
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"><Save className="h-4 w-4" /> Speichern</button>
            <button onClick={() => setFormOpen(false)} className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><X className="h-4 w-4" /> Abbrechen</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Laden...</p>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-500">{d}</div>
            ))}
            {days.map((date) => {
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const dayEvents = eventsForDay(date);
              return (
                <div
                  key={date.toISOString()}
                  className={`min-h-[80px] rounded-md border p-1 ${isCurrentMonth ? "bg-white border-gray-100" : "bg-gray-50 border-transparent"}`}
                >
                  <div className="text-right text-xs text-gray-500">{date.getDate()}</div>
                  <div className="mt-1 space-y-1">
                    {dayEvents.map((e) => (
                      <div
                        key={e.id}
                        className={`group flex items-center justify-between rounded px-1 py-0.5 text-xs ${typeColors[e.type] || "bg-gray-100"}`}
                      >
                        <span className="truncate cursor-pointer flex-1" onClick={() => startEdit(e)} title={e.title}>{e.title}</span>
                        <button onClick={() => handleDelete(e.id)} className="ml-1 opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
