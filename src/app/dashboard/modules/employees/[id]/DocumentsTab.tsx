"use client";

import { useEffect, useState } from "react";
import { Upload, Download, Trash2, FileStack, X, History, Plus, FolderPlus, ChevronDown, ChevronRight } from "lucide-react";
import {
  getEmployeeDocuments,
  createEmployeeDocument,
  uploadDocumentVersion,
  getDocumentVersions,
  deleteEmployeeDocument,
} from "@/lib/actions/employeeDocuments";
import type { DocumentContainerWithLatest } from "@/lib/actions/employeeDocuments";
import type { File as PrismaFile, DocumentCategory as PrismaDocumentCategory } from "@prisma/client";
import GroupGenerateDocumentModal from "@/components/templates/GroupGenerateDocumentModal";
import { getDocumentCategories } from "@/lib/actions/documentCategories";
import { validateUploadFile, uploadHint } from "@/lib/uploadValidation";
import {
  getDocumentTemplates,
  generateDocumentFromTemplate,
  getTemplateCustomVariables,
} from "@/lib/actions/documentTemplates";

export type FileItem = PrismaFile;

type Category = PrismaDocumentCategory;
type Template = Awaited<ReturnType<typeof getDocumentTemplates>>["templates"][number];

export default function DocumentsTab({
  employeeId,
  employee,
}: {
  employeeId: string;
  employee: Record<string, unknown>;
}) {
  const [documents, setDocuments] = useState<DocumentContainerWithLatest[]>([]);
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
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
  const [containerVersions, setContainerVersions] = useState<Record<string, FileItem[]>>({});
  const [loadingVersions, setLoadingVersions] = useState<Set<string>>(new Set());
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null);
  const [versionFormData, setVersionFormData] = useState({
    title: "",
    category: "OTHER",
    expiresAt: "",
    notes: "",
  });
  const [versionCategoryIds, setVersionCategoryIds] = useState<Set<string>>(new Set());
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => {
    async function load() {
      const [docResult, catResult, tmplResult] = await Promise.all([
        getEmployeeDocuments(employeeId),
        getDocumentCategories(),
        getDocumentTemplates(),
      ]);
      if (docResult.success) setDocuments(docResult.documents);
      if (catResult.success) setCategories(catResult.categories);
      if (tmplResult.success) setTemplates(tmplResult.templates);
    }
    load();
  }, [employeeId]);

  async function reloadDocuments() {
    const result = await getEmployeeDocuments(employeeId);
    if (result.success) setDocuments(result.documents);
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file") as File | null;
    const category = String(formData.get("category") || "OTHER");
    const title = String(formData.get("title") || "");
    const expiresAt = String(formData.get("expiresAt") || "");
    const notes = String(formData.get("notes") || "");

    if (!file || !title) {
      setError("Bitte Datei und Titel angeben");
      setUploading(false);
      return;
    }

    const validation = validateUploadFile(file);
    if (!validation.valid) {
      setError(validation.error);
      setUploading(false);
      return;
    }

    try {
      const uploadResponse = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok) {
        setError(uploadResult.error || "Upload fehlgeschlagen");
        return;
      }

      const createResult = await createEmployeeDocument({
        employeeId,
        fileId: uploadResult.fileId,
        title,
        category,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        notes,
        categoryIds: Array.from(selectedCategories),
      });

      if (!createResult.success) {
        setError(createResult.error || "Dokument konnte nicht erstellt werden");
        return;
      }

      form.reset();
      setSelectedCategories(new Set());
      await reloadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteContainer(containerId: string) {
    if (!confirm("Dokument wirklich in den Papierkorb verschieben?")) return;
    const result = await deleteEmployeeDocument(containerId, employeeId);
    if (!result.success) {
      setError(result.error || "Löschen fehlgeschlagen");
      return;
    }
    await reloadDocuments();
  }

  async function toggleExpanded(containerId: string) {
    const next = new Set(expandedContainers);
    if (next.has(containerId)) {
      next.delete(containerId);
      setExpandedContainers(next);
      return;
    }
    next.add(containerId);
    setExpandedContainers(next);

    if (!containerVersions[containerId] && !loadingVersions.has(containerId)) {
      setLoadingVersions((prev) => new Set(prev).add(containerId));
      try {
        const result = await getDocumentVersions(containerId);
        setContainerVersions((prev) => ({
          ...prev,
          [containerId]: result.success ? result.versions : [],
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fehler beim Laden der Versionen");
      } finally {
        setLoadingVersions((prev) => {
          const updated = new Set(prev);
          updated.delete(containerId);
          return updated;
        });
      }
    }
  }

  async function openVersionModal(container: DocumentContainerWithLatest) {
    setActiveContainerId(container.id);
    setVersionFormData({
      title: container.title || "",
      category: container.category || "OTHER",
      expiresAt: container.expiresAt ? new Date(container.expiresAt).toISOString().split("T")[0] : "",
      notes: container.notes || "",
    });
    setVersionCategoryIds(new Set(container.categories.map((c) => c.id)));
    setError(null);
    setShowVersionModal(true);
  }

  async function handleUploadVersion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeContainerId) return;
    const form = event.currentTarget;
    const input = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      setError("Bitte eine Datei auswählen");
      return;
    }

    const validation = validateUploadFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setUploadingVersion(true);
    setError(null);
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("category", versionFormData.category);
      uploadForm.append("title", versionFormData.title);
      uploadForm.append("notes", versionFormData.notes);
      if (versionFormData.expiresAt) {
        uploadForm.append("expiresAt", versionFormData.expiresAt);
      }

      const uploadResponse = await fetch("/api/files", {
        method: "POST",
        body: uploadForm,
      });

      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok) {
        setError(uploadResult.error || "Upload fehlgeschlagen");
        return;
      }

      const result = await uploadDocumentVersion({
        containerId: activeContainerId,
        fileId: uploadResult.fileId,
        title: versionFormData.title,
        category: versionFormData.category,
        expiresAt: versionFormData.expiresAt ? new Date(versionFormData.expiresAt).toISOString() : undefined,
        notes: versionFormData.notes,
        categoryIds: Array.from(versionCategoryIds),
      });

      if (!result.success) {
        setError(result.error || "Upload fehlgeschlagen");
        return;
      }

      input.value = "";
      const versionResult = await getDocumentVersions(activeContainerId);
      setContainerVersions((prev) => ({
        ...prev,
        [activeContainerId]: versionResult.success ? versionResult.versions : [],
      }));
      await reloadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploadingVersion(false);
    }
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

      const fileId = result.fileId;
      if (fileId) {
        await createEmployeeDocument({
          employeeId,
          fileId,
          title: generatedTitle,
          category: "DOCUMENT",
          expiresAt: generatedExpiresAt ? new Date(generatedExpiresAt).toISOString() : undefined,
          notes: generatedNotes,
          categoryIds: Array.from(generatedCategoryIds),
        });
      }

      setShowTemplateModal(false);
      setSelectedTemplateId(null);
      setGeneratedTitle("");
      setGeneratedExpiresAt("");
      setGeneratedNotes("");
      setGeneratedCategoryIds(new Set());
      setCustomVariables({});
      setCustomVarKeys([]);
      await reloadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generierung fehlgeschlagen");
    } finally {
      setGenerating(false);
    }
  }

  function formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  function categoryLabel(category: string | null | undefined) {
    const labels: Record<string, string> = {
      CONTRACT: "Vertrag",
      PAYSLIP: "Lohnabrechnung",
      DOCUMENT: "Dokument",
      CERTIFICATE: "Bescheinigung",
      AVATAR: "Avatar",
      OTHER: "Sonstiges",
    };
    return labels[category ?? ""] || category || "Sonstiges";
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

  function toggleVersionCategory(id: string) {
    setVersionCategoryIds((prev) => {
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGroupModal(true)}
              disabled={templates.length === 0}
              title={templates.length === 0 ? "Bitte zuerst unter Admin > Dokumentenvorlagen eine Vorlage anlegen" : "Dokumentengruppe aus mehreren Vorlagen erstellen"}
              className="flex items-center space-x-2 rounded-lg bg-primary-100 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Dokumentengruppe</span>
            </button>
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
            <p className="text-xs text-gray-500">{uploadHint()}</p>
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
                    selected ? "text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  style={{
                    backgroundColor: selected ? (category.color || undefined) : undefined,
                    borderColor: category.color || undefined,
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
              required
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
        {documents.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Noch keine Dokumente vorhanden.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-200">
            {documents.map((container) => (
              <li key={container.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(container.id)}
                      className="rounded p-1 text-gray-500 hover:bg-gray-100"
                      title={expandedContainers.has(container.id) ? "Einklappen" : "Aufklappen"}
                    >
                      {expandedContainers.has(container.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div>
                      <p className="truncate text-sm font-medium text-gray-900">{container.title || container.latestFile?.originalName || "Unbenannt"}</p>
                      <p className="text-xs text-gray-500">
                        {categoryLabel(container.category)} · {formatBytes(container.latestFile?.sizeBytes)} · Version {container.latestFile?.version ?? 1}
                        {container.expiresAt && (
                          <span className="ml-2">· gültig bis {new Date(container.expiresAt).toLocaleDateString("de-DE")}</span>
                        )}
                      </p>
                      {container.categories.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {container.categories.map((category) => {
                            const color = category.color || "#6b7280";
                            return (
                              <span
                                key={category.id}
                                className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium"
                                style={{
                                  backgroundColor: `${color}20`,
                                  color,
                                  border: `1px solid ${color}`,
                                }}
                              >
                                {category.name}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => openVersionModal(container)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                      title="Versionen verwalten"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    <a
                      href={`/api/files/${container.latestFile?.id}`}
                      download
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                      title="Herunterladen"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteContainer(container.id)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                      title="In Papierkorb verschieben"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {expandedContainers.has(container.id) && (
                  <div className="mt-3 bg-gray-50 px-4 py-3 rounded-lg">
                    {loadingVersions.has(container.id) ? (
                      <p className="text-sm text-gray-500">Versionen werden geladen...</p>
                    ) : (
                      <>
                        <h4 className="mb-2 text-sm font-medium text-gray-700">Versionen</h4>
                        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                          {(containerVersions[container.id] || []).map((v) => (
                            <li key={v.id} className="flex items-center justify-between px-4 py-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  Version {v.version} {v.isLatestVersion && <span className="ml-1 text-xs text-primary-600">(aktuell)</span>}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatBytes(v.sizeBytes)} · {new Date(v.createdAt).toLocaleString("de-DE")}
                                </p>
                              </div>
                              <a
                                href={`/api/files/${v.id}`}
                                download
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                                title="Herunterladen"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </li>
                          ))}
                          {(containerVersions[container.id] || []).length === 0 && (
                            <li className="px-4 py-2 text-sm text-gray-500">Keine Versionen gefunden.</li>
                          )}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Neue Version hochladen</h3>
              <button
                type="button"
                onClick={() => {
                  setShowVersionModal(false);
                  setActiveContainerId(null);
                }}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>}

            <form onSubmit={handleUploadVersion} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Datei</label>
                <input
                  type="file"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Titel</label>
                  <input
                    type="text"
                    required
                    value={versionFormData.title}
                    onChange={(e) => setVersionFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Dateityp</label>
                  <select
                    value={versionFormData.category}
                    onChange={(e) => setVersionFormData((prev) => ({ ...prev, category: e.target.value }))}
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
                    const selected = versionCategoryIds.has(category.id);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleVersionCategory(category.id)}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                          selected ? "text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                        style={{
                          backgroundColor: selected ? (category.color || undefined) : undefined,
                          borderColor: category.color || undefined,
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
                  <label className="block text-sm font-medium text-gray-700">Ablaufdatum (optional)</label>
                  <input
                    type="date"
                    value={versionFormData.expiresAt}
                    onChange={(e) => setVersionFormData((prev) => ({ ...prev, expiresAt: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Notizen</label>
                <textarea
                  rows={2}
                  value={versionFormData.notes}
                  onChange={(e) => setVersionFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <button
                type="submit"
                disabled={uploadingVersion}
                className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>{uploadingVersion ? "Wird hochgeladen..." : "Version hochladen"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

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
                          backgroundColor: selected ? (category.color || undefined) : undefined,
                          borderColor: category.color || undefined,
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
      {showGroupModal && (
        <GroupGenerateDocumentModal
          isOpen={showGroupModal}
          onClose={() => setShowGroupModal(false)}
          onSuccess={() => {
            setShowGroupModal(false);
            reloadDocuments();
          }}
          employeeId={employeeId}
          employeeFullName={`${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim()}
          employeeCity={typeof employee.address === "object" && employee.address !== null ? (employee.address as Record<string, unknown>).city as string | null : null}
        />
      )}
    </div>
  );
}
