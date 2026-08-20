"use client";

import { useEffect, useState } from "react";
import { getProjects, createProject, updateProject, deleteProject, type ProjectWithDetails } from "@/lib/actions/projects";
import { getEmployees } from "@/lib/actions/employees";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Briefcase } from "lucide-react";
import Link from "next/link";

const statusLabels: Record<string, string> = {
  PLANNED: "Geplant",
  ACTIVE: "Aktiv",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgebrochen",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [employees, setEmployees] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProjectWithDetails | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "PLANNED" as const,
    availableForPlanning: false,
    startDate: "",
    endDate: "",
    budget: "",
    employeeIds: [] as string[],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [projs, emps] = await Promise.all([getProjects(), getEmployees()]);
    setProjects(projs);
    setEmployees(emps.map((e) => ({ id: e.id, firstName: e.firstName, lastName: e.lastName })));
    setLoading(false);
  }

  function startEdit(project: ProjectWithDetails) {
    setEditing(project);
    setForm({
      name: project.name,
      description: project.description ?? "",
      status: project.status as typeof form.status,
      availableForPlanning: (project as any).availableForPlanning ?? false,
      startDate: project.startDate ? new Date(project.startDate).toISOString().split("T")[0] : "",
      endDate: project.endDate ? new Date(project.endDate).toISOString().split("T")[0] : "",
      budget: project.budget?.toString() ?? "",
      employeeIds: project.employees.map((pe) => pe.employeeId),
    });
    setShowForm(true);
  }

  function startCreate() {
    setEditing(null);
    setForm({ name: "", description: "", status: "PLANNED", availableForPlanning: false, startDate: "", endDate: "", budget: "", employeeIds: [] });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      ...form,
      budget: form.budget ? Number(form.budget) : null,
      employeeIds: form.employeeIds,
    };

    const res = editing ? await updateProject(editing.id, payload) : await createProject(payload);

    if (!res.success) {
      setError(res.error);
      return;
    }

    setShowForm(false);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Projekt wirklich löschen?")) return;
    const res = await deleteProject(id);
    if (!res.success) {
      alert(res.error);
      return;
    }
    await load();
  }

  function toggleEmployee(id: string) {
    setForm((f) => ({
      ...f,
      employeeIds: f.employeeIds.includes(id) ? f.employeeIds.filter((x) => x !== id) : [...f.employeeIds, id],
    }));
  }

  if (loading) return <p className="p-6">Lade Projekte...</p>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Projekte</h1>
        </div>
        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Neues Projekt
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Projekt bearbeiten" : "Neues Projekt"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung</Label>
                <textarea
                  id="description"
                  className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof form.status }))}
                  >
                    <option value="PLANNED">Geplant</option>
                    <option value="ACTIVE">Aktiv</option>
                    <option value="COMPLETED">Abgeschlossen</option>
                    <option value="CANCELLED">Abgebrochen</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget (€)</Label>
                  <Input id="budget" type="number" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start</Label>
                  <Input id="startDate" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Ende</Label>
                  <Input id="endDate" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md border p-3">
                <input
                  id="availableForPlanning"
                  type="checkbox"
                  checked={form.availableForPlanning}
                  onChange={(e) => setForm((f) => ({ ...f, availableForPlanning: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="availableForPlanning" className="mb-0 cursor-pointer">Für Einsatzplanung freigeben</Label>
              </div>
              <div className="space-y-2">
                <Label>Mitarbeiter</Label>
                <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                  {employees.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.employeeIds.includes(e.id)}
                        onChange={() => toggleEmployee(e.id)}
                        className="rounded"
                      />
                      {e.firstName} {e.lastName}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editing ? "Speichern" : "Erstellen"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Abbrechen</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {projects.length === 0 ? (
        <p className="text-muted-foreground">Noch keine Projekte vorhanden.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      <Link href={`/dashboard/modules/projects/${p.id}`} className="hover:underline">{p.name}</Link>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {p._count?.timeEntries ?? 0} Zeiteinträge · {p.employees.length} Mitarbeiter · {p.milestones.length} Meilensteine · {statusLabels[p.status]}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {p.description && <p className="text-sm">{p.description}</p>}
                <div className="flex flex-wrap gap-1">
                  {(p as any).availableForPlanning && (
                    <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                      Für Einsatzplanung freigegeben
                    </span>
                  )}
                  {p.employees.map((pe) => (
                    <span key={pe.id} className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">
                      {pe.employee.firstName} {pe.employee.lastName}
                    </span>
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" className="px-2 py-1" onClick={() => startEdit(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" className="px-2 py-1" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
