"use client";

import { useEffect, useState } from "react";
import { Upload, Download, Trash2, FileStack, X } from "lucide-react";
import { listFiles, deleteFile } from "@/lib/actions/files";
import { getDocumentCategories } from "@/lib/actions/documentCategories";
import {
  getDocumentTemplates,
  generateDocumentFromTemplate,
  getTemplateCustomVariables,
} from "@/lib/actions/documentTemplates";
import type { File as PrismaFile, DocumentCategory as PrismaDocumentCategory } from "@prisma/client";

type FileItem = PrismaFile & { documentCategories?: { category: PrismaDocumentCategory }[] };
type Category = PrismaDocumentCategory;
type Template = Awaited<ReturnType<typeof getDocumentTemplates>>["templates"][number];

export default function DocumentsTab({
  employeeId,
  employee,
  files,
  onFilesChange,
}: {
  employeeId: string;
  employee: Record<string, unknown>;
  files: FileItem[];
  onFilesChange: (files: FileItem[]) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedExpiresAt, setGeneratedExpiresAt] = useState("");
  const [generatedNotes, setGeneratedNotes] = useState("");
  const [generatedCategoryIds, setGeneratedCategoryIds] = useState<Set<string>>(new Set());
  const [customVariables, setCustomVariables] = useState<Record<string, string>>({});
  const [customVarKeys, setCustomVarKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [catResult, tmplResult] = await Promise.all([
        getDocumentCategories(),
        getDocumentTemplates(),
      ]);
      if (catResult.success) setCategories(catResult.categories);
      if (tmplResult.success) setTemplates(tmplResult.templates);
    }
    load();
  }, []);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.append("employeeId", employeeId);
    formData.append("parentType", "employee");
    formData.append("parentId", employeeId);
    formData.append("documentCategoryIds", Array.from(selectedCategories).join(","));

    try {
      const response = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Upload fehlgeschlagen");
        return;
      }

      form.reset();
      setSelectedCategories(new Set());
      await reloadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  async function reloadFiles() {
    const fileResult = await listFiles({ employeeId, limit: 100 });
    // Also load category links for display; listFiles currently returns File only.
    // For now we display based on the simple category field.
    onFilesChange(fileResult.files as FileItem[]);
  }

  async function handleDeleteFile(fileId: string) {
    if (!confirm("Dokument wirklich in den Papierkorb verschieben?")) return;
    const result = await deleteFile(fileId);
    if (!result.success) {
      setError(result.error || "Löschen fehlgeschlagen");
      return;
    }
    await reloadFiles();
  }

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedTemplateId) return;

    setGenerating(true);
    setError(null);

    try {
      const result = await generateDocumentFromTemplate(selectedTemplateId, employeeId, {
        title: generatedTitle,
        expiresAt: generatedExpiresAt,
        notes: generatedNotes,
        categoryIds: Array.from(generatedCategoryIds),
        customValues: customVariables,
      });
      if (!result.success) {
        setError(result.error || "Generierung fehlgeschlagen");
        return;
      }
      setShowTemplateModal(false);
      setSelectedTemplateId(null);
      setGeneratedTitle("");
      setGeneratedExpiresAt("");
      setGeneratedNotes("");
      setGeneratedCategoryIds(new Set());
      setCustomVariables({});
      setCustomVarKeys([]);
      await reloadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generierung fehlgeschlagen");
    } finally {
      setGenerating(false);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  function categoryLabel(category: FileItem["category"]) {
    const labels: Record<string, string> = {
      CONTRACT: "Vertrag",
      PAYSLIP: "Lohnabrechnung",
      DOCUMENT: "Dokument",
      CERTIFICATE: "Bescheinigung",
      AVATAR: "Avatar",
      OTHER: "Sonstiges",
    };
    return labels[category] || category;
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGeneratedCategory(id: string) {
    setGeneratedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleUpload} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Dokument hochladen</h3>
          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            disabled={templates.length === 0}
            title={templates.length === 0 ? "Bitte zuerst unter Admin > Dokumentenvorlagen eine Vorlage anlegen" : "Dokument aus Vorlage generieren"}
            className="flex items-center space-x-2 rounded-lg bg-primary-100 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileStack className="h-4 w-4" />
            <span>Aus Vorlage generieren</span>
          </button>
        </div>

        {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="file" className="block text-sm font-medium text-gray-700">Datei</label>
            <input
              id="file"
              name="file"
              type="file"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Dateityp</label>
            <select
              id="category"
              name="category"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="OTHER">Sonstiges</option>
              <option value="CONTRACT">Vertrag</option>
              <option value="PAYSLIP">Lohnabrechnung</option>
              <option value="DOCUMENT">Dokument</option>
              <option value="CERTIFICATE">Bescheinigung</option>
              <option value="AVATAR">Avatar</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Dokumentenkategorien</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const selected = selectedCategories.has(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    selected
                      ? "text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  style={{
                    backgroundColor: selected ? category.color : undefined,
                    borderColor: category.color,
                  }}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Dokumententitel</label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="z. B. Arbeitsvertrag 2026"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700">Ablaufdatum (optional)</label>
            <input
              id="expiresAt"
              name="expiresAt"
              type="date"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notizen</label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          <span>{uploading ? "Wird hochgeladen..." : "Hochladen"}</span>
        </button>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900">Dokumente</h3>
        {files.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Noch keine Dokumente vorhanden.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-200">
            {files
              .filter((f) => !f.isDeleted)
              .map((file) => (
                <li key={file.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{file.title || file.originalName}</p>
                    <p className="text-xs text-gray-500">
                      {categoryLabel(file.category)} · {formatBytes(file.sizeBytes)} · Version {file.version}
                      {file.expiresAt && (
                        <span className="ml-2">· gültig bis {new Date(file.expiresAt).toLocaleDateString("de-DE")}</span>
                      )}
                    </p>
                    {file.documentCategories && file.documentCategories.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {file.documentCategories.map(({ category }) => (
                          <span
                            key={category.id}
                            className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: `${category.color}20`,
                              color: category.color,
                              border: `1px solid ${category.color}`,
                            }}
                          >
                            {category.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    <a
                      href={`/api/files/${file.id}`}
                      download
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                      title="Herunterladen"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(file.id)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                      title="In Papierkorb verschieben"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Dokument aus Vorlage generieren</h3>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Vorlage</label>
                <select
                  required
                  value={selectedTemplateId ?? ""}
                  onChange={async (e) => {
                    const id = e.target.value;
                    setSelectedTemplateId(id || null);
                    const tmpl = templates.find((t) => t.id === id);
                    if (tmpl) setGeneratedTitle(tmpl.name);
                    if (id) {
                      const res = await getTemplateCustomVariables(id);
                      if (res.success) {
                        setCustomVarKeys(res.variables ?? []);
                        setCustomVariables({});
                      }
                    } else {
                      setCustomVarKeys([]);
                      setCustomVariables({});
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                >
                  <option value="">Bitte wählen</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              </div>

              {customVarKeys.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Zusätzliche Variablen</label>
                  {customVarKeys.map((key) => (
                    <div key={key} className="grid grid-cols-3 gap-3">
                      <label className="col-span-1 text-sm text-gray-700">{key}</label>
                      <input
                        type="text"
                        value={customVariables[key] ?? ""}
                        onChange={(e) => setCustomVariables((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={`{{${key}}}`}
                        className="col-span-2 w-full rounded-lg border border-gray-300 px-4 py-2"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Titel</label>
                <input
                  type="text"
                  required
                  value={generatedTitle}
                  onChange={(e) => setGeneratedTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Ablaufdatum (optional)</label>
                <input
                  type="date"
                  value={generatedExpiresAt}
                  onChange={(e) => setGeneratedExpiresAt(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Kategorien</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const selected = generatedCategoryIds.has(category.id);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleGeneratedCategory(category.id)}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                          selected ? "text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                        style={{
                          backgroundColor: selected ? category.color : undefined,
                          borderColor: category.color,
                        }}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Notizen</label>
                <textarea
                  rows={3}
                  value={generatedNotes}
                  onChange={(e) => setGeneratedNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={generating || !selectedTemplateId}
                  className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  <FileStack className="h-4 w-4" />
                  <span>{generating ? "Wird generiert..." : "PDF generieren"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
