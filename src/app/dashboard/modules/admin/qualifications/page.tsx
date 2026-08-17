"use client";

import { useEffect, useState } from "react";
import {
  getAllQualifications,
  createQualification,
  updateQualification,
  deleteQualification,
} from "@/lib/actions/qualifications";
import type { Qualification } from "@prisma/client";
import { Pencil, Trash2, Save, X, Award } from "lucide-react";

export default function QualificationsAdminPage() {
  const [items, setItems] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Qualification | null>(null);
  const [form, setForm] = useState({
    name: "",
    issuer: "",
    description: "",
    validityInMonths: "",
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    const data = await getAllQualifications();
    setItems(data);
    setLoading(false);
  }

  function reset() {
    setEditing(null);
    setForm({ name: "", issuer: "", description: "", validityInMonths: "", isActive: true });
    setError(null);
  }

  function startEdit(item: Qualification) {
    setEditing(item);
    setForm({
      name: item.name,
      issuer: item.issuer ?? "",
      description: item.description ?? "",
      validityInMonths: item.validityInMonths?.toString() ?? "",
      isActive: item.isActive,
    });
    setError(null);
  }

  async function handleSave() {
    setError(null);
    const data = {
      name: form.name.trim(),
      issuer: form.issuer.trim() || undefined,
      description: form.description.trim() || undefined,
      validityInMonths: form.validityInMonths.trim() ? Number(form.validityInMonths) : null,
    };

    if (!data.name) {
      setError("Name ist ein Pflichtfeld.");
      return;
    }

    const res = editing
      ? await updateQualification(editing.id, { ...data, isActive: form.isActive })
      : await createQualification(data);

    if (res.success) {
      reset();
      await refresh();
    } else {
      setError(res.error || "Fehler beim Speichern");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" wirklich löschen?`)) return;
    const res = await deleteQualification(id);
    if (res.success) await refresh();
    else setError(res.error || "Fehler beim Löschen");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Award className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Qualifikationen</h1>
          <p className="mt-2 text-sm text-gray-600">Verwalten Sie den Katalog für Mitarbeiter-Qualifikationen, Lizenzen und Zertifikate.</p>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Aussteller / Stelle</label>
            <input
              type="text"
              value={form.issuer}
              onChange={(e) => setForm((prev) => ({ ...prev, issuer: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Beschreibung</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Gültigkeit (Monate)</label>
            <input
              type="number"
              value={form.validityInMonths}
              onChange={(e) => setForm((prev) => ({ ...prev, validityInMonths: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="optional"
            />
          </div>
          {editing && (
            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Aktiv</label>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Save className="h-4 w-4" />
            {editing ? "Speichern" : "Hinzufügen"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              Abbrechen
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Laden...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">Noch keine Qualifikationen vorhanden.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    {!item.isActive && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Inaktiv</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {item.issuer && <span className="mr-2">Aussteller: {item.issuer}</span>}
                    {item.validityInMonths && <span>Gültigkeit: {item.validityInMonths} Monate</span>}
                  </p>
                  {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                    aria-label="Bearbeiten"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id, item.name)}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    aria-label="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
