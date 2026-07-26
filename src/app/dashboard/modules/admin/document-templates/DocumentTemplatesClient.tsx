'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TemplateEditorDialog } from "@/components/templates/TemplateEditorDialog";

interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  content: string;
  categoryId: string | null;
  isActive: boolean;
  variables: string[];
  category?: { name: string } | null;
}

interface Props {
  templates: Template[];
  categories: Category[];
  onCreate: (data: {
    name: string;
    description: string;
    content: string;
    categoryId: string;
    isActive: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  onUpdate: (id: string, data: {
    name: string;
    description: string;
    content: string;
    categoryId: string;
    isActive: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export function DocumentTemplatesClient({
  templates,
  categories,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: {
    id?: string;
    name: string;
    description: string;
    content: string;
    categoryId: string;
    isActive: boolean;
  }) => {
    setError(null);
    const result = data.id
      ? await onUpdate(data.id, {
          name: data.name,
          description: data.description,
          content: data.content,
          categoryId: data.categoryId,
          isActive: data.isActive,
        })
      : await onCreate({
          name: data.name,
          description: data.description,
          content: data.content,
          categoryId: data.categoryId,
          isActive: data.isActive,
        });

    if (!result.success) {
      setError(result.error ?? "Speichern fehlgeschlagen");
      return;
    }

    setIsOpen(false);
    setEditingTemplate(undefined);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    setError(null);
    const result = await onDelete(id);
    if (!result.success) {
      setError(result.error ?? "Löschen fehlgeschlagen");
      return;
    }
    setIsOpen(false);
    setEditingTemplate(undefined);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Vorlagen</h2>
          <button
            type="button"
            onClick={() => {
              setEditingTemplate(undefined);
              setIsOpen(true);
            }}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Neue Vorlage
          </button>
        </div>

        <table className="mt-4 min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Beschreibung</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Variablen</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Kategorie</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {templates.map((template) => (
              <tr key={template.id}>
                <td className="px-4 py-3 text-sm text-gray-900">{template.name}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{template.description ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <span className="text-xs text-gray-500">
                    {template.variables.length > 0 ? template.variables.join(", ") : "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{template.category?.name ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {template.isActive ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Aktiv</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">Inaktiv</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setEditingTemplate(template);
                      setIsOpen(true);
                    }}
                    className="rounded bg-primary-100 px-3 py-1 text-xs text-primary-700 hover:bg-primary-200"
                  >
                    Bearbeiten
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <TemplateEditorDialog
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setEditingTemplate(undefined);
        }}
        template={
          editingTemplate
            ? {
                id: editingTemplate.id,
                name: editingTemplate.name,
                description: editingTemplate.description ?? "",
                content: editingTemplate.content,
                categoryId: editingTemplate.categoryId ?? "",
                isActive: editingTemplate.isActive,
              }
            : undefined
        }
        categories={categories}
        onSubmit={handleSubmit}
        onDelete={
          editingTemplate
            ? () => handleDelete(editingTemplate.id)
            : undefined
        }
      />
    </div>
  );
}
