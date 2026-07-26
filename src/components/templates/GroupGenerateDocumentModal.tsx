"use client";

import { useEffect, useState } from "react";
import { Files, X, Download, CheckCircle, ChevronRight, ChevronLeft, GripVertical } from "lucide-react";
import { getDocumentTemplates, getTemplateCustomVariablesForMany, generateDocumentGroup } from "@/lib/actions/documentTemplates";
import { getDocumentCategories } from "@/lib/actions/documentCategories";

interface Template {
  id: string;
  name: string;
  description: string | null;
}

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeId: string;
  employeeFullName: string;
  employeeCity: string | null;
}

type Step = "select" | "custom-vars" | "meta";

function keyToLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export default function GroupGenerateDocumentModal({
  isOpen,
  onClose,
  onSuccess,
  employeeId,
  employeeFullName,
  employeeCity,
}: Props) {
  const [step, setStep] = useState<Step>("select");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [loadingVars, setLoadingVars] = useState(false);
  const [templateCustomVars, setTemplateCustomVars] = useState<Record<string, string[]>>({});
  const [customVarValues, setCustomVarValues] = useState<Record<string, Record<string, string>>>({});

  const [title, setTitle] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [signingCity, setSigningCity] = useState("");
  const [pageNumbers, setPageNumbers] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedFileId, setGeneratedFileId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep("select");
    setSelectedIds([]);
    setTemplateCustomVars({});
    setCustomVarValues({});
    setTitle("");
    setExpiresAt("");
    setCompanyName("");
    setSigningCity(employeeCity ?? "");
    setPageNumbers(false);
    setSelectedCategoryIds([]);
    setError(null);
    setGeneratedFileId(null);

    setLoadingTemplates(true);
    getDocumentTemplates()
      .then((data) => {
        if (data.success) setTemplates(data.templates.map((t) => ({ id: t.id, name: t.name, description: t.description })));
      })
      .catch(() => setError("Vorlagen konnten nicht geladen werden"))
      .finally(() => setLoadingTemplates(false));

    getDocumentCategories()
      .then((data) => {
        if (data.success) setAvailableCategories(data.categories);
      })
      .catch(() => {});
  }, [isOpen, employeeCity]);

  const toggleTemplate = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const moveTemplate = (index: number, direction: -1 | 1) => {
    const newIds = [...selectedIds];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newIds.length) return;
    [newIds[index], newIds[targetIndex]] = [newIds[targetIndex], newIds[index]];
    setSelectedIds(newIds);
  };

  const setVarValue = (templateId: string, key: string, value: string) => {
    setCustomVarValues((prev) => ({
      ...prev,
      [templateId]: { ...(prev[templateId] ?? {}), [key]: value },
    }));
  };

  const setSharedVarValue = (key: string, value: string) => {
    setCustomVarValues((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        if (templateCustomVars[id]?.includes(key)) {
          next[id] = { ...(next[id] ?? {}), [key]: value };
        }
      }
      return next;
    });
  };

  const handleNext = async () => {
    if (selectedIds.length === 0) {
      setError("Bitte mindestens eine Vorlage auswählen");
      return;
    }
    setError(null);

    setLoadingVars(true);
    try {
      const res = await getTemplateCustomVariablesForMany(selectedIds);
      if (!res.success || !res.variables) {
        setError(res.error || "Variablen konnten nicht geladen werden");
        return;
      }
      const newCustomVars = res.variables;
      const newValues: Record<string, Record<string, string>> = {};
      for (const id of selectedIds) {
        const keys = newCustomVars[id] ?? [];
        newValues[id] = Object.fromEntries(keys.map((k) => [k, customVarValues[id]?.[k] ?? ""]));
      }
      setTemplateCustomVars(newCustomVars);
      setCustomVarValues(newValues);

      if (!title && selectedIds[0]) {
        const firstTemplate = templates.find((t) => t.id === selectedIds[0]);
        if (firstTemplate) setTitle(firstTemplate.name);
      }

      const hasAnyCustomVars = Object.values(newCustomVars).some((keys) => keys.length > 0);
      setStep(hasAnyCustomVars ? "custom-vars" : "meta");
    } catch {
      setError("Vorlagen-Variablen konnten nicht geladen werden");
    } finally {
      setLoadingVars(false);
    }
  };

  const handleGenerate = async () => {
    if (!companyName.trim()) {
      setError("Firmenname ist erforderlich");
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedFileId(null);
    try {
      const result = await generateDocumentGroup(employeeId, {
        templateIds: selectedIds,
        customVariables: customVarValues,
        title: title.trim() || undefined,
        expiresAt: expiresAt || undefined,
        categoryIds: selectedCategoryIds,
        companyName: companyName.trim(),
        signingCity: signingCity.trim(),
        pageNumbers,
      });

      if (!result.success) {
        setError(result.error || "Generierung fehlgeschlagen");
        return;
      }

      setGeneratedFileId(result.fileId ?? null);
      onSuccess();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const hasAnyCustomVars = selectedIds.some((id) => (templateCustomVars[id] ?? []).length > 0);
  const totalSteps = hasAnyCustomVars ? 3 : 2;
  const currentStepNum = step === "select" ? 1 : step === "custom-vars" ? 2 : totalSteps;

  const allVarEntries: Record<string, string[]> = {};
  for (const id of selectedIds) {
    for (const key of templateCustomVars[id] ?? []) {
      allVarEntries[key] = [...(allVarEntries[key] ?? []), id];
    }
  }
  const sharedKeys = Object.keys(allVarEntries).filter((k) => allVarEntries[k].length > 1);
  const sharedKeySet = new Set(sharedKeys);

  const selectedTemplates = selectedIds
    .map((id) => templates.find((t) => t.id === id))
    .filter(Boolean) as Template[];

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
              <Files className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Dokumentengruppe erstellen</h2>
              {!generatedFileId && <p className="text-xs text-gray-400 mt-0.5">Schritt {currentStepNum} von {totalSteps}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {generatedFileId && (
            <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Dokumentengruppe erfolgreich erstellt!</p>
                <p className="text-xs text-green-700 mt-0.5">Das Dokument wurde gespeichert.</p>
              </div>
              <a
                href={`/api/files/${generatedFileId}`}
                download
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
              >
                <Download className="h-3.5 w-3.5" />
                PDF öffnen
              </a>
            </div>
          )}

          {!generatedFileId && step === "select" && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Vorlagen auswählen <span className="text-red-500">*</span></p>
                <p className="mb-3 text-xs text-gray-500">Die Reihenfolge der Auswahl bestimmt die Dokumentenreihenfolge im PDF.</p>
                {loadingTemplates ? (
                  <p className="text-sm text-gray-500">Lädt…</p>
                ) : templates.length === 0 ? (
                  <p className="text-sm text-gray-500">Noch keine Vorlagen vorhanden.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {templates.map((t) => {
                      const isSelected = selectedIds.includes(t.id);
                      const orderIndex = selectedIds.indexOf(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTemplate(t.id)}
                          className={`w-full rounded-lg border px-4 py-3 text-left transition-colors flex items-start gap-3 ${
                            isSelected ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSelected ? "border-primary-500 bg-primary-500" : "border-gray-300"}`}>
                            {isSelected && (
                              <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{t.name}</p>
                            {t.description && <p className="mt-0.5 text-xs text-gray-500 truncate">{t.description}</p>}
                          </div>
                          {isSelected && <span className="ml-auto shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">{orderIndex + 1}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedIds.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-gray-600 uppercase tracking-wide">Reihenfolge im Vertrag</p>
                  <div className="space-y-1.5">
                    {selectedTemplates.map((t, i) => (
                      <div key={t.id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
                        <span className="text-xs font-bold text-primary-600 w-4 shrink-0">{i + 1}.</span>
                        <span className="flex-1 text-sm text-gray-800 truncate">{t.name}</span>
                        <div className="flex gap-1 shrink-0">
                          <button type="button" onClick={(e) => { e.stopPropagation(); moveTemplate(i, -1); }} disabled={i === 0} className="rounded p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-25">▲</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); moveTemplate(i, 1); }} disabled={i === selectedIds.length - 1} className="rounded p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-25">▼</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!generatedFileId && step === "custom-vars" && (
            <div className="space-y-4">
              {sharedKeys.length > 0 && (
                <div>
                  <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 mb-3">
                    <p className="text-sm font-medium text-blue-900">Geteilte Angaben</p>
                    <p className="text-xs text-blue-700 mt-0.5">Diese Felder werden in mehreren Vorlagen verwendet und nur einmal eingegeben.</p>
                  </div>
                  <div className="space-y-3">
                    {sharedKeys.map((key) => {
                      const firstOwner = allVarEntries[key][0];
                      const value = customVarValues[firstOwner]?.[key] ?? "";
                      return (
                        <div key={key}>
                          <label className="mb-1 block text-sm font-medium text-gray-700">{keyToLabel(key)} <span className="text-xs font-normal text-gray-400">{`{{${key}}}`}</span></label>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => setSharedVarValue(key, e.target.value)}
                            placeholder={`Wert für {{${key}}}`}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedIds.map((id) => {
                const template = templates.find((t) => t.id === id);
                const uniqueKeys = (templateCustomVars[id] ?? []).filter((k) => !sharedKeySet.has(k));
                if (!template || uniqueKeys.length === 0) return null;
                return (
                  <div key={id}>
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 mb-3">
                      <p className="text-sm font-medium text-amber-900">Pflichtangaben für „{template.name}"</p>
                    </div>
                    <div className="space-y-3">
                      {uniqueKeys.map((key) => (
                        <div key={key}>
                          <label className="mb-1 block text-sm font-medium text-gray-700">{keyToLabel(key)} <span className="text-xs font-normal text-gray-400">{`{{${key}}}`}</span></label>
                          <input
                            type="text"
                            value={customVarValues[id]?.[key] ?? ""}
                            onChange={(e) => setVarValue(id, key, e.target.value)}
                            placeholder={`Wert für {{${key}}}`}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!generatedFileId && step === "meta" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600 space-y-1">
                {selectedTemplates.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="font-bold text-primary-600 w-5 shrink-0">{i + 1}.</span>
                    <span className="text-gray-800">{t.name}</span>
                  </div>
                ))}
                <p className="text-xs text-gray-400 mt-1.5">+ Automatische Zusammenfassungsseite</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Dokumenttitel</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Wird automatisch aus erster Vorlage übernommen"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Ablaufdatum</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pageNumbers}
                  onChange={(e) => setPageNumbers(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Seitennummerierung (unten rechts, durchlaufend)</span>
              </label>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Firma (Arbeitgeber) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="z.B. Schendel GmbH"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Ort (für Unterschriftzeile)</label>
                <input
                  type="text"
                  value={signingCity}
                  onChange={(e) => setSigningCity(e.target.value)}
                  placeholder="z.B. Moers"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Kategorien</label>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map((category) => {
                    const selected = selectedCategoryIds.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleCategory(category.id)}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                          selected ? "text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                        style={{ backgroundColor: selected ? category.color ?? "#3B82F6" : undefined, borderColor: category.color ?? "#3B82F6" }}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 shrink-0">
          <div>
            {step === "custom-vars" && (
              <button onClick={() => { setStep("select"); setError(null); }} disabled={loading} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                <ChevronLeft className="h-4 w-4" /> Zurück
              </button>
            )}
            {step === "meta" && (
              <button onClick={() => { setStep(hasAnyCustomVars ? "custom-vars" : "select"); setError(null); }} disabled={loading} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                <ChevronLeft className="h-4 w-4" /> Zurück
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {generatedFileId ? "Schließen" : "Abbrechen"}
            </button>

            {!generatedFileId && step === "select" && (
              <button onClick={handleNext} disabled={selectedIds.length === 0 || loadingVars} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                {loadingVars ? "Lädt…" : "Weiter"}
                {!loadingVars && <ChevronRight className="h-4 w-4" />}
              </button>
            )}

            {!generatedFileId && step === "custom-vars" && (
              <button onClick={() => { setStep("meta"); setError(null); }} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
                Weiter <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {!generatedFileId && step === "meta" && (
              <button onClick={handleGenerate} disabled={loading} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                <Files className="h-4 w-4" />
                {loading ? "Wird generiert…" : "Generieren & Speichern"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
