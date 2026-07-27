"use client";

import { useState } from "react";
import {
  createDocumentCategory,
  updateDocumentCategory,
  deleteDocumentCategory,
  type DocumentCategory,
} from "@/lib/actions/documentCategories";

interface Props {
  categories: DocumentCategory[];
}

export default function DocumentCategoriesClient({ categories }: Props) {
  const [items, setItems] = useState(categories);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleCreate(formData: FormData) {
    setError(null);
    setSuccess(null);
    const result = await createDocumentCategory({
      name: String(formData.get("name")),
      description: String(formData.get("description") || ""),
      color: String(formData.get("color") || "#3B82F6"),
      isActive: formData.get("isActive") === "on",
    });
    if (!result.success || !result.category) {
      setError((result as { error?: string }).error || "Erstellen fehlgeschlagen");
      return;
    }
    setItems((prev) => [...prev, result.category!].sort((a, b) => a.name.localeCompare(b.name)));
    setSuccess("Kategorie erstellt");
  }

  async function handleUpdate(formData: FormData) {
    setError(null);
    setSuccess(null);
    const id = String(formData.get("id"));
    const result = await updateDocumentCategory(id, {
      name: String(formData.get("name")),
      description: String(formData.get("description") || ""),
      color: String(formData.get("color") || "#3B82F6"),
      isActive: formData.get("isActive") === "on",
    });
    if (!result.success || !result.category) {
      setError((result as { error?: string }).error || "Speichern fehlgeschlagen");
      return;
    }
    setItems((prev) =>
      prev
        .map((item) => (item.id === id ? result.category! : item))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setSuccess("Kategorie gespeichert");
  }

  async function handleRemove(formData: FormData) {
    setError(null);
    setSuccess(null);
    const id = String(formData.get("id"));
    const result = await deleteDocumentCategory(id);
    if (!result.success) {
      setError((result as { error?: string }).error || "Löschen fehlgeschlagen");
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    setSuccess("Kategorie entfernt");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dokumentenkategorien</h1>
      <p className="text-sm text-gray-600">
        Verwalte Kategorien für Dokumente. Inaktive Kategorien bleiben an bestehenden Dokumenten erhalten, können aber nicht mehr neu zugeordnet werden.
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {success}
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Neue Kategorie</h2>
        <form action={handleCreate} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-5">
          <input
            type="text"
            name="name"
            placeholder="Name"
            required
            className="rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="text"
            name="description"
            placeholder="Beschreibung"
            className="rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:col-span-2"
          />
          <div className="flex items-center gap-3">
            <input
              type="color"
              name="color"
              defaultValue="#3B82F6"
              className="h-11 w-11 rounded border border-gray-300 p-1"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="isActive" defaultChecked className="rounded" />
              Aktiv
            </label>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Hinzufügen
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Beschreibung</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Farbe</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {items.map((category) => (
              <tr key={category.id}>
                <td colSpan={5} className="p-0">
                  <form action={handleUpdate} className="contents">
                    <div className="table-row">
                      <div className="table-cell px-4 py-3 text-sm text-gray-900">
                        <input type="hidden" name="id" value={category.id} />
                        <input
                          type="text"
                          name="name"
                          defaultValue={category.name}
                          required
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
                        />
                      </div>
                      <div className="table-cell px-4 py-3 text-sm text-gray-900">
                        <input
                          type="text"
                          name="description"
                          defaultValue={category.description ?? ""}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
                        />
                      </div>
                      <div className="table-cell px-4 py-3 text-sm text-gray-900">
                        <input
                          type="color"
                          name="color"
                          defaultValue={category.color}
                          className="h-8 w-8 rounded border border-gray-300 p-0.5"
                        />
                      </div>
                      <div className="table-cell px-4 py-3 text-sm text-gray-900">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            name="isActive"
                            defaultChecked={category.isActive}
                            className="rounded"
                          />
                          {category.isActive ? "Aktiv" : "Inaktiv"}
                        </label>
                      </div>
                      <div className="table-cell px-4 py-3 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="submit"
                            className="rounded bg-primary-100 px-3 py-1 text-xs text-primary-700 hover:bg-primary-200"
                          >
                            Speichern
                          </button>
                          <button
                            formAction={handleRemove}
                            className="rounded bg-red-50 px-3 py-1 text-xs text-red-700 hover:bg-red-100"
                          >
                            Löschen
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  Noch keine Kategorien vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
