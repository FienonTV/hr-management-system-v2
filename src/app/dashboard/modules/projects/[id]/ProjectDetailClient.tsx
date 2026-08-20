"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updateProject,
  deleteProject,
  createProjectMilestone,
  updateMilestoneStatus,
  type ProjectWithDetails,
  type MilestoneStatus,
} from "@/lib/actions/projects";
import { getProjectLayout } from "@/lib/actions/projectLayouts";
import { getProjectCustomFieldDefinitions } from "@/lib/actions/projectCatalogs";
import type { CustomFieldDefinition } from "@prisma/client";
import type { ProjectLayoutTab } from "@/lib/projectLayout";
import ProjectFormRenderer from "./ProjectFormRenderer";
import { ArrowLeft, Pencil, Trash2, Plus, CheckCircle2, Circle, User, Briefcase } from "lucide-react";

interface ProjectDetailClientProps {
  project: ProjectWithDetails;
  employees: { id: string; firstName: string | null; lastName: string | null }[];
  layout: ProjectLayoutTab[];
  fieldDefinitions: CustomFieldDefinition[];
}

export default function ProjectDetailClient({ project, employees, layout, fieldDefinitions }: ProjectDetailClientProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: project.name,
    code: project.code ?? "",
    description: project.description ?? "",
    customValues: { ...project.customValues },
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
      name: form.name,
      code: form.code || null,
      description: form.description,
      customValues: form.customValues,
      employeeIds: form.employeeIds,
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

  function handleCustomValueChange(key: string, value: unknown) {
    setForm((f) => ({
      ...f,
      customValues: { ...f.customValues, [key]: value },
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
          <ProjectFormRenderer
            tabs={layout}
            fieldDefinitions={fieldDefinitions}
            values={{
              name: form.name,
              code: form.code,
              description: form.description,
              ...form.customValues,
            }}
            onChange={(key, value) => {
              if (key === "name" || key === "code" || key === "description") {
                setForm((f) => ({ ...f, [key]: value }));
              } else {
                handleCustomValueChange(key, value);
              }
            }}
          />

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
                  {e.firstName ?? "–"} {e.lastName ?? "–"}
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
          <ProjectFormRenderer
            tabs={layout}
            fieldDefinitions={fieldDefinitions}
            values={{
              name: project.name,
              code: project.code,
              description: project.description,
              ...project.customValues,
            }}
            disabled
          />

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
