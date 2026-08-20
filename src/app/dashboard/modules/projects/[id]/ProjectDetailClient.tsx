"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProject, deleteProject, createProjectMilestone, updateMilestoneStatus, type ProjectWithDetails, type MilestoneStatus } from "@/lib/actions/projects";
import { ArrowLeft, Pencil, Trash2, Plus, CheckCircle2, Circle, Building2, Calendar, MapPin, Mail, User, Briefcase } from "lucide-react";

const statusLabels: Record<string, string> = {
  PLANNED: "Geplant",
  ACTIVE: "Aktiv",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgebrochen",
};

interface ProjectDetailClientProps {
  project: ProjectWithDetails;
  employees: { id: string; firstName: string; lastName: string }[];
}

export default function ProjectDetailClient({ project, employees }: ProjectDetailClientProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: project.name,
    code: project.code ?? "",
    description: project.description ?? "",
    status: project.status,
    availableForPlanning: (project as any).availableForPlanning ?? false,
    customerName: project.customerName ?? "",
    customerEmail: project.customerEmail ?? "",
    address: project.address ?? "",
    startDate: project.startDate ? new Date(project.startDate).toISOString().split("T")[0] : "",
    endDate: project.endDate ? new Date(project.endDate).toISOString().split("T")[0] : "",
    budget: project.budget?.toString() ?? "",
    notes: project.notes ?? "",
    employeeIds: project.employees.map((pe) => pe.employeeId),
  });
  const [milestoneForm, setMilestoneForm] = useState({ title: "", plannedDate: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await updateProject(project.id, {
      ...form,
      budget: form.budget ? Number(form.budget) : null,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setMessage("Gespeichert.");
    setIsEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Projekt wirklich löschen?")) return;
    const res = await deleteProject(project.id);
    if (!res.success) {
      alert(res.error);
      return;
    }
    router.push("/dashboard/modules/projects");
  }

  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!milestoneForm.title.trim()) return;
    const res = await createProjectMilestone(project.id, {
      title: milestoneForm.title,
      plannedDate: milestoneForm.plannedDate || null,
      status: "OPEN",
    });
    if (!res.success) {
      alert(res.error);
      return;
    }
    setMilestoneForm({ title: "", plannedDate: "" });
    router.refresh();
  }

  async function toggleMilestone(id: string, current: MilestoneStatus) {
    const next: MilestoneStatus = current === "OPEN" ? "DONE" : "OPEN";
    const res = await updateMilestoneStatus(id, next);
    if (!res.success) {
      alert(res.error);
      return;
    }
    router.refresh();
  }

  function toggleEmployee(id: string) {
    setForm((f) => ({
      ...f,
      employeeIds: f.employeeIds.includes(id) ? f.employeeIds.filter((x) => x !== id) : [...f.employeeIds, id],
    }));
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/modules/projects" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="mr-1 h-4 w-4" /> Zurück
          </Link>
          <h1 className="text-2xl font-bold">{project.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing((v) => !v)}>
            <Pencil className="mr-2 h-4 w-4" /> {isEditing ? "Ansicht" : "Bearbeiten"}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Löschen
          </Button>
        </div>
      </div>

      {message && <p className="text-sm text-green-600">{message}</p>}

      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Projektcode</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
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
              <Label>Budget (€)</Label>
              <Input type="number" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Start</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Ende</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Kunde</Label>
              <Input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Kunden-E-Mail</Label>
              <Input type="email" value={form.customerEmail} onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Adresse</Label>
            <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <textarea
              className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
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
            <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-1">
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
            <Button type="submit" disabled={saving}>{saving ? "Speichert…" : "Speichern"}</Button>
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Abbrechen</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Projektdaten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-gray-500">Status:</span> {statusLabels[project.status]}</p>
                {(project as any).availableForPlanning && (
                  <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">Für Einsatzplanung freigegeben</span>
                )}
                {project.code && <p><span className="text-gray-500">Code:</span> {project.code}</p>}
                {project.customerName && <p><span className="text-gray-500">Kunde:</span> {project.customerName}</p>}
                {project.customerEmail && <p><span className="text-gray-500">E-Mail:</span> {project.customerEmail}</p>}
                {project.address && <p className="flex items-start gap-1"><MapPin className="mt-0.5 h-3.5 w-3.5 text-gray-500" /> {project.address}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Zeitraum
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-gray-500">Start:</span> {project.startDate ? new Date(project.startDate).toLocaleDateString("de-DE") : "–"}</p>
                <p><span className="text-gray-500">Ende:</span> {project.endDate ? new Date(project.endDate).toLocaleDateString("de-DE") : "–"}</p>
                <p><span className="text-gray-500">Budget:</span> {project.budget ? `${Number(project.budget)} €` : "–"}</p>
              </CardContent>
            </Card>
          </div>

          {project.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Beschreibung</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{project.description}</CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" /> Mitarbeiter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.employees.length === 0 ? (
                    <span className="text-sm text-gray-500">Keine Mitarbeiter zugewiesen.</span>
                  ) : (
                    project.employees.map((pe) => (
                      <span key={pe.id} className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium">
                        {pe.employee.firstName} {pe.employee.lastName}
                      </span>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> Meilensteine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleAddMilestone} className="flex flex-wrap items-end gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="milestoneTitle" className="text-sm">Titel</Label>
                    <Input id="milestoneTitle" value={milestoneForm.title} onChange={(e) => setMilestoneForm((f) => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="milestoneDate" className="text-sm">Geplantes Datum</Label>
                    <Input id="milestoneDate" type="date" value={milestoneForm.plannedDate} onChange={(e) => setMilestoneForm((f) => ({ ...f, plannedDate: e.target.value }))} />
                  </div>
                  <Button type="submit" className="mb-0.5">
                    <Plus className="mr-1 h-4 w-4" /> Hinzufügen
                  </Button>
                </form>

                <div className="space-y-2">
                  {project.milestones.length === 0 ? (
                    <p className="text-sm text-gray-500">Noch keine Meilensteine.</p>
                  ) : (
                    project.milestones.map((m) => {
                      const Icon = m.status === "DONE" ? CheckCircle2 : Circle;
                      return (
                        <div key={m.id} className="flex items-center justify-between rounded-md border p-3">
                          <div className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 ${m.status === "DONE" ? "text-green-600" : "text-gray-400"}`} />
                            <div>
                              <p className="text-sm font-medium">{m.title}</p>
                              {m.plannedDate && <p className="text-xs text-gray-500">Geplant: {new Date(m.plannedDate).toLocaleDateString("de-DE")}</p>}
                            </div>
                          </div>
                          <Button variant="outline" className="text-sm px-3 py-1" onClick={() => toggleMilestone(m.id, m.status)}>
                            {m.status === "OPEN" ? "Abschließen" : "Wieder öffnen"}
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
