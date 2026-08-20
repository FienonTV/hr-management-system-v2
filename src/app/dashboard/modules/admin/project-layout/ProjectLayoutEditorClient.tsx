"use client";

import { useState, useMemo } from "react";
import type { CustomFieldDefinition, CustomFieldType } from "@prisma/client";
import type { ProjectLayoutTab, ProjectLayoutCard, ProjectLayoutField } from "@/lib/projectLayout";
import { DEFAULT_PROJECT_LAYOUT } from "@/lib/projectLayout";
import { saveProjectLayout } from "@/lib/actions/projectLayouts";
import { createProjectCustomFieldDefinition, deleteProjectCustomFieldDefinition } from "@/lib/actions/projectCatalogs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, GripVertical, Save, LayoutTemplate, X, Settings2, Columns2, Columns3, Square } from "lucide-react";
import { useRouter } from "next/navigation";

const CORE_FIELDS: { id: string; key: string; name: string; fieldType: CustomFieldType }[] = [
  { id: "code", key: "code", name: "Projektnummer", fieldType: "TEXT" },
  { id: "name", key: "name", name: "Bezeichnung", fieldType: "TEXT" },
  { id: "description", key: "description", name: "Beschreibung", fieldType: "TEXTAREA" },
];

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  TEXT: "Text",
  TEXTAREA: "Text mehrzeilig",
  NUMBER: "Zahl",
  DATE: "Datum",
  BOOLEAN: "Ja/Nein",
  SELECT: "Auswahl",
  MULTI_SELECT: "Mehrfachauswahl",
};

function createField(definitionId: string, columnIndex = 0, sortOrder = 0): ProjectLayoutField {
  return { id: crypto.randomUUID(), definitionId, columnIndex, sortOrder };
}

function NewFieldDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (field: { key: string; name: string; fieldType: CustomFieldType; options: { values?: string[] } | null }) => void;
}) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<CustomFieldType>("TEXT");
  const [options, setOptions] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  function reset() {
    setKey("");
    setName("");
    setFieldType("TEXT");
    setOptions("");
    setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!key.trim() || !name.trim()) {
      setError("Key und Name sind erforderlich.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(key.trim())) {
      setError("Key darf nur Buchstaben, Zahlen und Unterstriche enthalten.");
      return;
    }
    let parsedOptions: { values?: string[] } | null = null;
    if (fieldType === "SELECT" || fieldType === "MULTI_SELECT") {
      const values = options.split("\n").map((s) => s.trim()).filter(Boolean);
      if (values.length === 0) {
        setError("Mindestens eine Auswahloption erforderlich (zeilenweise).");
        return;
      }
      parsedOptions = { values };
    }
    onSave({ key: key.trim(), name: name.trim(), fieldType, options: parsedOptions });
    reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Neues Feld definieren</h2>
          <Button variant="outline" className="h-8 w-8 p-0" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="space-y-1.5">
            <Label htmlFor="fieldKey">Key (technisch)</Label>
            <Input id="fieldKey" value={key} onChange={(e) => setKey(e.target.value)} placeholder="z.B. kostenstelle" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fieldName">Anzeigename</Label>
            <Input id="fieldName" value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Kostenstelle" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fieldType">Feldtyp</Label>
            <select
              id="fieldType"
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {(Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[]).map((t) => (
                <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          {(fieldType === "SELECT" || fieldType === "MULTI_SELECT") && (
            <div className="space-y-1.5">
              <Label htmlFor="fieldOptions">Optionen (zeilenweise)</Label>
              <textarea
                id="fieldOptions"
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                className="w-full min-h-[100px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                placeholder="Option A&#10;Option B&#10;Option C"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Abbrechen</Button>
            <Button type="submit">Speichern</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectLayoutEditorClient({
  initialTabs,
  fieldDefinitions: initialFieldDefinitions,
}: {
  initialTabs?: ProjectLayoutTab[];
  fieldDefinitions: CustomFieldDefinition[];
}) {
  const router = useRouter();
  const [tabs, setTabs] = useState<ProjectLayoutTab[]>(initialTabs?.length ? initialTabs : DEFAULT_PROJECT_LAYOUT);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomFieldDefinition[]>(initialFieldDefinitions);
  const [showNewFieldDialog, setShowNewFieldDialog] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const allFields = useMemo(
    () => [
      ...CORE_FIELDS,
      ...fieldDefinitions.filter((d) => d.appliesTo === "project").map((d) => ({ id: d.id, key: d.key, name: d.name, fieldType: d.fieldType })),
    ],
    [fieldDefinitions]
  );

  function addTab() {
    const newTab: ProjectLayoutTab = { id: crypto.randomUUID(), title: `Tab ${tabs.length + 1}`, sortOrder: tabs.length, cards: [] };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  }

  function updateTab(id: string, title: string) {
    setTabs(tabs.map((t) => (t.id === id ? { ...t, title } : t)));
  }

  function removeTab(id: string) {
    const next = tabs.filter((t) => t.id !== id);
    setTabs(next);
    if (activeTabId === id) setActiveTabId(next[0]?.id ?? "");
  }

  function addCard(tabId: string) {
    setTabs(
      tabs.map((t) => {
        if (t.id !== tabId) return t;
        const newCard: ProjectLayoutCard = { id: crypto.randomUUID(), title: "Neue Sektion", columns: 2, sortOrder: t.cards.length, fields: [] };
        return { ...t, cards: [...t.cards, newCard] };
      })
    );
  }

  function updateCard(tabId: string, cardId: string, updates: Partial<ProjectLayoutCard>) {
    setTabs(
      tabs.map((t) => (t.id === tabId ? { ...t, cards: t.cards.map((c) => (c.id === cardId ? { ...c, ...updates } : c)) } : t))
    );
  }

  function removeCard(tabId: string, cardId: string) {
    setTabs(tabs.map((t) => (t.id === tabId ? { ...t, cards: t.cards.filter((c) => c.id !== cardId) } : t)));
  }

  function addField(tabId: string, cardId: string, definitionId: string) {
    setTabs(
      tabs.map((t) => {
        if (t.id !== tabId) return t;
        return {
          ...t,
          cards: t.cards.map((c) => (c.id === cardId ? { ...c, fields: [...c.fields, createField(definitionId, 0, c.fields.length)] } : c)),
        };
      })
    );
  }

  function removeField(tabId: string, cardId: string, fieldId: string) {
    setTabs(
      tabs.map((t) =>
        t.id === tabId ? { ...t, cards: t.cards.map((c) => (c.id === cardId ? { ...c, fields: c.fields.filter((f) => f.id !== fieldId) } : c)) } : t
      )
    );
  }

  function moveField(tabId: string, cardId: string, fieldId: string, newColumnIndex: number) {
    setTabs(
      tabs.map((t) =>
        t.id === tabId
          ? {
              ...t,
              cards: t.cards.map((c) =>
                c.id === cardId
                  ? { ...c, fields: c.fields.map((f) => (f.id === fieldId ? { ...f, columnIndex: Math.max(0, Math.min(newColumnIndex, c.columns - 1)) } : f)) }
                  : c
              ),
            }
          : t
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const res = await saveProjectLayout(tabs);
    setSaving(false);
    if (res.success) {
      setMessage("Layout gespeichert.");
      router.refresh();
    } else {
      setMessage(res.error);
    }
  }

  async function handleCreateField(field: { key: string; name: string; fieldType: CustomFieldType; options: { values?: string[] } | null }) {
    setMessage("");
    const res = await createProjectCustomFieldDefinition(field);
    if (!res.success) {
      setMessage(res.error);
      return;
    }
    setFieldDefinitions([...fieldDefinitions, res.definition]);
    setShowNewFieldDialog(false);
  }

  async function handleDeleteField(id: string) {
    if (!confirm("Feld wirklich löschen? Es wird aus dem Layout entfernt, aber bestehende Projektdaten bleiben erhalten.")) return;
    setMessage("");
    const res = await deleteProjectCustomFieldDefinition(id);
    if (!res.success) {
      setMessage(res.error);
      return;
    }
    const def = fieldDefinitions.find((d) => d.id === id);
    setFieldDefinitions(fieldDefinitions.filter((d) => d.id !== id));
    if (def) {
      setTabs(
        tabs.map((t) => ({
          ...t,
          cards: t.cards.map((c) => ({ ...c, fields: c.fields.filter((f) => f.definitionId !== def.key) })),
        }))
      );
    }
  }

  return (
    <div className="p-6">
      {message && (
        <div
          className={`mb-4 rounded-md px-4 py-2 text-sm ${
            message.includes("Fehler") || message.includes("erforderlich") || message.includes("Doppelte") || message.includes("außerhalb")
              ? "bg-red-50 text-red-600"
              : "bg-green-50 text-green-600"
          }`}
        >
          {message}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Projekt-Layout-Editor</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Speichern..." : "Layout speichern"}
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Tabs */}
        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Tabs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 ${
                    activeTabId === tab.id ? "border-primary bg-primary/5" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  <Input
                    value={tab.title}
                    onChange={(e) => updateTab(tab.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className={`h-7 border-0 bg-transparent px-0 text-sm focus-visible:ring-0 ${
                      activeTabId === tab.id ? "font-medium" : ""
                    }`}
                  />
                  <Button
                    variant="outline"
                   
                    className="ml-auto h-6 w-6 p-0"
                    onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full gap-1" onClick={addTab}>
                <Plus className="h-4 w-4" />
                Tab
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Editor */}
        <div className="col-span-7 space-y-6">
          {activeTab ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{activeTab.title} &#183; {activeTab.cards.length} Sektionen</span>
                <Button onClick={() => addCard(activeTab.id)} variant="outline" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Sektion
                </Button>
              </div>

              {activeTab.cards.map((card) => (
                <Card key={card.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-gray-400" />
                      <Input
                        value={card.title}
                        onChange={(e) => updateCard(activeTab.id, card.id, { title: e.target.value })}
                        className="h-8 max-w-sm border-0 bg-transparent px-0 text-base font-semibold focus-visible:ring-0"
                      />
                      <div className="ml-auto flex items-center gap-3">
                        <div className="flex items-center gap-1 rounded-md border border-gray-200 p-0.5">
                          <button
                            type="button"
                            title="1 Spalte"
                            onClick={() => updateCard(activeTab.id, card.id, { columns: 1 })}
                            className={`flex h-7 w-8 items-center justify-center rounded text-sm ${card.columns === 1 ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                          >
                            <Square className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="2 Spalten"
                            onClick={() => updateCard(activeTab.id, card.id, { columns: 2 })}
                            className={`flex h-7 w-8 items-center justify-center rounded text-sm ${card.columns === 2 ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                          >
                            <Columns2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="3 Spalten"
                            onClick={() => updateCard(activeTab.id, card.id, { columns: 3 })}
                            className={`flex h-7 w-8 items-center justify-center rounded text-sm ${card.columns === 3 ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                          >
                            <Columns3 className="h-4 w-4" />
                          </button>
                        </div>
                        <Button variant="outline" className="h-7 w-7 p-0" onClick={() => removeCard(activeTab.id, card.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className={`grid gap-6 ${card.columns === 1 ? "grid-cols-1" : card.columns === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                      {Array.from({ length: card.columns }).map((_, colIdx) => (
                        <div key={colIdx} className="space-y-3">
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Spalte {colIdx + 1}</span>
                            <span>{card.fields.filter((f) => f.columnIndex === colIdx).length}</span>
                          </div>
                          <div className="space-y-2">
                            {card.fields
                              .filter((f) => f.columnIndex === colIdx)
                              .map((field) => {
                                const def = allFields.find((f) => f.key === field.definitionId || f.id === field.definitionId);
                                return (
                                  <div
                                    key={field.id}
                                    className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium">{def?.name ?? field.definitionId}</p>
                                      <p className="text-xs text-gray-500">{def ? FIELD_TYPE_LABELS[def.fieldType] : "Unbekannt"}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {card.columns > 1 && (
                                        <select
                                          value={field.columnIndex}
                                          onChange={(e) => moveField(activeTab.id, card.id, field.id, Number(e.target.value))}
                                          className="h-7 rounded border border-gray-200 bg-white px-1 text-xs"
                                        >
                                          {Array.from({ length: card.columns }).map((_, i) => (
                                            <option key={i} value={i}>Spalte {i + 1}</option>
                                          ))}
                                        </select>
                                      )}
                                      <Button
                                        variant="outline"
                                       
                                        className="h-7 w-7 p-0"
                                        onClick={() => removeField(activeTab.id, card.id, field.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {activeTab.cards.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
                  <Settings2 className="h-10 w-10 text-gray-300" />
                  <p className="mt-3 text-sm text-gray-500">Dieser Tab hat noch keine Sektionen.</p>
                  <Button onClick={() => addCard(activeTab.id)} variant="outline" className="mt-4 gap-1">
                    <Plus className="h-4 w-4" />
                    Sektion hinzufügen
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-gray-500">
              <Settings2 className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm">Kein Tab ausgewählt.</p>
            </div>
          )}
        </div>

        {/* Field pool */}
        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Feld-Pool</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Button onClick={() => setShowNewFieldDialog(true)} variant="outline" className="w-full gap-1">
                <Plus className="h-4 w-4" />
                Feld definieren
              </Button>

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Kernfelder</p>
                {CORE_FIELDS.map((field) => (
                  <PoolItem
                    key={field.key}
                    field={field}
                    onAdd={() => activeTab?.cards[0] && addField(activeTab.id, activeTab.cards[activeTab.cards.length - 1].id, field.key)}
                    disabled={!activeTab?.cards.length}
                  />
                ))}
              </div>

              <div className="h-px bg-gray-200" />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500">Eigene Felder</p>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{fieldDefinitions.length}</span>
                </div>
                {fieldDefinitions.length === 0 ? (
                  <p className="text-sm text-gray-500">Noch keine eigenen Felder.</p>
                ) : (
                  fieldDefinitions.map((field) => (
                    <PoolItem
                      key={field.id}
                      field={{ id: field.id, key: field.key, name: field.name, fieldType: field.fieldType }}
                      onAdd={() => activeTab?.cards[0] && addField(activeTab.id, activeTab.cards[activeTab.cards.length - 1].id, field.key)}
                      onDelete={() => handleDeleteField(field.id)}
                      disabled={!activeTab?.cards.length}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <NewFieldDialog open={showNewFieldDialog} onClose={() => setShowNewFieldDialog(false)} onSave={handleCreateField} />
    </div>
  );
}

function PoolItem({
  field,
  onAdd,
  onDelete,
  disabled,
}: {
  field: { id: string; key: string; name: string; fieldType: CustomFieldType };
  onAdd: () => void;
  onDelete?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="group flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{field.name}</p>
        <p className="text-xs text-gray-500">{FIELD_TYPE_LABELS[field.fieldType]}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
         
          className="h-7 w-7 p-0"
          onClick={onAdd}
          disabled={disabled}
          title="Zur letzten Sektion hinzufügen"
        >
          <Plus className="h-4 w-4" />
        </Button>
        {onDelete && (
          <Button
            variant="outline"
           
            className="h-7 w-7 p-0"
            onClick={onDelete}
            title="Feld löschen"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
