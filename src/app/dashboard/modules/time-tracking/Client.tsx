"use client";

import { useEffect, useState } from "react";
import { getTimeEntries, createTimeEntry, approveTimeEntry, deleteTimeEntry, exportTimeEntriesCsv, type TimeEntryWithRelations, type TimeEntryStatus } from "@/lib/actions/timeTracking";
import { timeEntryTypeLabel } from "@/lib/timeEntryUtils";
import { getEmployees } from "@/lib/actions/employees";
import { getProjects } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Download, Plus, CheckCircle, Trash2 } from "lucide-react";

const statusLabels: Record<TimeEntryStatus, string> = {
  DRAFT: "Entwurf",
  SUBMITTED: "Eingereicht",
  APPROVED: "Freigegeben",
};

export default function TimeTrackingPage() {
  const [entries, setEntries] = useState<TimeEntryWithRelations[]>([]);
  const [employees, setEmployees] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    projectId: "",
    date: new Date().toISOString().split("T")[0],
    hours: "",
    description: "",
    type: "REGULAR" as const,
  });
  const [filterFrom, setFilterFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [filterTo, setFilterTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, [filterFrom, filterTo]);

  async function load() {
    setLoading(true);
    const [ents, emps, projs] = await Promise.all([
      getTimeEntries({ from: filterFrom, to: filterTo }),
      getEmployees(),
      getProjects(),
    ]);
    setEntries(ents);
    setEmployees(emps.map((e) => ({ id: e.id, firstName: e.firstName, lastName: e.lastName })));
    setProjects(projs.map((p) => ({ id: p.id, name: p.name })));
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await createTimeEntry({
      employeeId: form.employeeId,
      projectId: form.projectId || null,
      date: form.date,
      hours: Number(form.hours),
      description: form.description,
      type: form.type,
    });
    if (!res.success) {
      setError(res.error);
      return;
    }
    setShowForm(false);
    setForm((f) => ({ ...f, hours: "", description: "" }));
    await load();
  }

  async function handleApprove(id: string) {
    const res = await approveTimeEntry(id);
    if (!res.success) {
      alert(res.error);
      return;
    }
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Zeiteintrag löschen?")) return;
    const res = await deleteTimeEntry(id);
    if (!res.success) {
      alert(res.error);
      return;
    }
    await load();
  }

  async function handleExport() {
    const res = await exportTimeEntriesCsv(filterFrom, filterTo);
    if (!res.success) {
      alert(res.error);
      return;
    }
    const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="p-6">Lade Zeiterfassung...</p>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Zeiterfassung</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            CSV Export
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Eintrag
          </Button>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="from">Von</Label>
          <Input id="from" type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to">Bis</Label>
          <Input id="to" type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
        </div>
        <Button variant="outline" onClick={load}>Aktualisieren</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Neuer Zeiteintrag</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
              <div className="space-y-1">
                <Label htmlFor="employee">Mitarbeiter</Label>
                <select id="employee" required value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                  <option value="">Wählen...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="project">Projekt</Label>
                <select id="project" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                  <option value="">Kein Projekt</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="date">Datum</Label>
                <Input id="date" type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hours">Stunden</Label>
                <Input id="hours" type="number" step="0.25" required value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="type">Typ</Label>
                <select id="type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                  <option value="REGULAR">Regulär</option>
                  <option value="OVERTIME">Überstunden</option>
                  <option value="TRAVEL">Anfahrt</option>
                  <option value="BREAK">Pause</option>
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="description">Beschreibung</Label>
                <input id="description" className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="col-span-2 flex gap-2">
                <Button type="submit">Speichern</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Abbrechen</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <p className="text-muted-foreground">Keine Zeiteinträge im Zeitraum.</p>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">Datum</th>
                <th className="px-3 py-2 text-left">Mitarbeiter</th>
                <th className="px-3 py-2 text-left">Projekt</th>
                <th className="px-3 py-2 text-left">Typ</th>
                <th className="px-3 py-2 text-right">Stunden</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="px-3 py-2">{new Date(e.date).toLocaleDateString("de-DE")}</td>
                  <td className="px-3 py-2">{e.employee.firstName} {e.employee.lastName}</td>
                  <td className="px-3 py-2">{e.project?.name ?? "—"}</td>
                  <td className="px-3 py-2">{timeEntryTypeLabel(e.type as any)}</td>
                  <td className="px-3 py-2 text-right">{e.hours.toNumber()}</td>
                  <td className="px-3 py-2">{statusLabels[e.status as TimeEntryStatus]}</td>
                  <td className="px-3 py-2 text-right">
                    {e.status !== "APPROVED" && (
                      <Button variant="outline" className="px-2 py-1 mr-1" onClick={() => handleApprove(e.id)}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="destructive" className="px-2 py-1" onClick={() => handleDelete(e.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
