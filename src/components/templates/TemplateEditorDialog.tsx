'use client';

import { useState, useEffect } from "react";
import { TemplateEditor } from "./TemplateEditor";

interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

interface TemplateFormData {
  id?: string;
  name: string;
  description: string;
  content: string;
  categoryId: string;
  isActive: boolean;
}

interface TemplateEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template?: TemplateFormData;
  categories: Category[];
  onSubmit: (data: TemplateFormData) => void;
  onDelete?: () => void;
}

export function TemplateEditorDialog({
  isOpen,
  onClose,
  template,
  categories,
  onSubmit,
  onDelete,
}: TemplateEditorDialogProps) {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [content, setContent] = useState(template?.content ?? "<p></p>");
  const [categoryId, setCategoryId] = useState(template?.categoryId ?? "");
  const [isActive, setIsActive] = useState(template?.isActive ?? true);

  useEffect(() => {
    if (isOpen) {
      setName(template?.name ?? "");
      setDescription(template?.description ?? "");
      setContent(template?.content ?? "<p></p>");
      setCategoryId(template?.categoryId ?? "");
      setIsActive(template?.isActive ?? true);
    }
  }, [isOpen, template?.id, template?.name, template?.description, template?.content, template?.categoryId, template?.isActive]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit({
      id: template?.id,
      name: name.trim(),
      description: description.trim(),
      content,
      categoryId,
      isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl" style={{ maxHeight: "92vh" }}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {template ? "Vorlage bearbeiten" : "Neue Vorlage erstellen"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Vorlagenname <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Arbeitsvertrag"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Kategorie</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Keine Kategorie</option>
                {categories.filter((c) => c.isActive).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="tmpl-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="tmpl-active" className="text-sm text-gray-700">Aktiv</label>
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Beschreibung</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung (optional)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <TemplateEditor initialContent={content} onChange={setContent} />
        </div>

        <div className="flex justify-between border-t border-gray-200 px-6 py-4">
          <div>
            {onDelete && template && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Deaktivieren
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!name.trim() || !content || content === "<p></p>"}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {template ? "Speichern" : "Vorlage erstellen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
