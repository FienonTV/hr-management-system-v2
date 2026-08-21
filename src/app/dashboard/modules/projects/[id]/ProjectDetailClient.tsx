"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProject, deleteProject, type ProjectWithDetails } from "@/lib/actions/projects";
import type { CustomFieldDefinition } from "@prisma/client";
import type { ProjectLayoutTab } from "@/lib/projectLayout";
import ProjectFormRenderer from "./ProjectFormRenderer";
import { ArrowLeft, Save, Trash2 } from "lucide-react";

interface ProjectDetailClientProps {
  project: ProjectWithDetails;
  layout: ProjectLayoutTab[];
  fieldDefinitions: CustomFieldDefinition[];
}

export default function ProjectDetailClient({ project, layout, fieldDefinitions }: ProjectDetailClientProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: project.name,
    code: project.code ?? "",
    description: project.description ?? "",
    customValues: { ...project.customValues },
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    setError("");
    setSaving(true);
    const res = await updateProject(project.id, {
      name: form.name,
      code: form.code || null,
      description: form.description,
      customValues: form.customValues,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setMessage("Gespeichert.");
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

  function handleChange(key: string, value: unknown) {
    if (key === "name" || key === "code" || key === "description") {
      setForm((f) => ({ ...f, [key]: value }));
    } else {
      setForm((f) => ({ ...f, customValues: { ...f.customValues, [key]: value } }));
    }
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
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Speichert…" : "Speichern"}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Löschen
          </Button>
        </div>
      </div>

      {message && <p className="text-sm text-green-600">{message}</p>}
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
        onChange={handleChange}
      />
    </div>
  );
}
