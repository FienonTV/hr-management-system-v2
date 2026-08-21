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
import {
  DndContext,
  closestCenter,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

function findFieldContainer(state: ProjectLayoutTab[], fieldId: string): { tabId: string; cardId: string; colIdx: number } | null {
  for (const tab of state) {
    for (const card of tab.cards) {
      for (const field of card.fields) {
        if (field.id === fieldId) {
          return { tabId: tab.id, cardId: card.id, colIdx: field.columnIndex };
        }
      }
    }
  }
  return null;
}

function insertOrMoveField(
  state: ProjectLayoutTab[],
  fieldId: string,
  target: { tabId: string; cardId: string; colIdx: number; index: number }
): ProjectLayoutTab[] {
  let movedField: ProjectLayoutField | undefined;

  const without = state.map((tab) => ({
    ...tab,
    cards: tab.cards.map((card) => ({
      ...card,
      fields: card.fields.filter((f) => {
        if (f.id === fieldId) {
          movedField = f;
          return false;
        }
        return true;
      }),
    })),
  }));

  if (!movedField) return state;

  const updated: ProjectLayoutField = { ...movedField, columnIndex: target.colIdx };

  return without.map((tab) => {
    if (tab.id !== target.tabId) return tab;
    return {
      ...tab,
      cards: tab.cards.map((card) => {
        if (card.id !== target.cardId) return card;
        const sameCol = card.fields.filter((f) => f.columnIndex === target.colIdx);
        const otherCol = card.fields.filter((f) => f.columnIndex !== target.colIdx);
        const before = sameCol.slice(0, target.index);
        const after = sameCol.slice(target.index);
        const reordered = [...before, updated, ...after].map((f, i) => ({ ...f, sortOrder: i }));
        return { ...card, fields: [...otherCol, ...reordered] };
      }),
    };
  });
}

type DragItem =
  | { type: "pool-field"; id: string; key: string; name: string; fieldType: CustomFieldType }
  | { type: "tab"; tab: ProjectLayoutTab }
  | { type: "card"; card: ProjectLayoutCard }
  | { type: "field"; id: string; key: string; name: string; fieldType: CustomFieldType };

export default function ProjectLayoutEditorClient({
  initialTabs,
  fieldDefinitions: initialFieldDefinitions,
  permissions = [],
}: {
  initialTabs?: ProjectLayoutTab[];
  fieldDefinitions: CustomFieldDefinition[];
  permissions?: string[];
}) {
  const router = useRouter();
  const canUpdateLayout = permissions.includes("projectLayout:update");
  const canUpdateFields = permissions.includes("projectCustomFields:update");

  const [tabs, setTabs] = useState<ProjectLayoutTab[]>(initialTabs?.length ? initialTabs : DEFAULT_PROJECT_LAYOUT);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomFieldDefinition[]>(initialFieldDefinitions);
  const [showNewFieldDialog, setShowNewFieldDialog] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

  function addField(tabId: string, cardId: string, definitionId: string, colIdx = 0) {
    setTabs(
      tabs.map((t) => {
        if (t.id !== tabId) return t;
        return {
          ...t,
          cards: t.cards.map((c) =>
            c.id === cardId
              ? { ...c, fields: [...c.fields, createField(definitionId, colIdx, c.fields.filter((f) => f.columnIndex === colIdx).length)] }
              : c
          ),
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

  function resolveDragItem(id: string): DragItem | null {
    const def = allFields.find((f) => f.key === id || f.id === id);
    if (def) return { type: "pool-field", ...def };

    const tab = tabs.find((t) => t.id === id);
    if (tab) return { type: "tab", tab };

    for (const t of tabs) {
      const card = t.cards.find((c) => c.id === id);
      if (card) return { type: "card", card };
    }

    const placed = findFieldContainer(tabs, id);
    if (placed) {
      const field = tabs
        .find((t) => t.id === placed.tabId)
        ?.cards.find((c) => c.id === placed.cardId)
        ?.fields.find((f) => f.id === id);
      if (field) {
        const fieldDef = allFields.find((f) => f.key === field.definitionId || f.id === field.definitionId);
        if (fieldDef) return { type: "field", id: field.id, key: field.definitionId, name: fieldDef.name, fieldType: fieldDef.fieldType };
      }
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const item = resolveDragItem(String(event.active.id));
    if (item) setActiveDragItem(item);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeItem = resolveDragItem(activeId);
    if (!activeItem) return;

    if (activeItem.type === "tab") {
      const oldIndex = tabs.findIndex((t) => t.id === activeId);
      const newIndex = tabs.findIndex((t) => t.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(tabs, oldIndex, newIndex).map((t, i) => ({ ...t, sortOrder: i }));
      setTabs(reordered);
      return;
    }

    if (activeItem.type === "card") {
      if (!activeTab) return;
      const cards = activeTab.cards;
      const oldIndex = cards.findIndex((c) => c.id === activeId);
      const newIndex = cards.findIndex((c) => c.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(cards, oldIndex, newIndex).map((c, i) => ({ ...c, sortOrder: i }));
      setTabs(tabs.map((t) => (t.id === activeTab.id ? { ...t, cards: reordered } : t)));
      return;
    }

    if (activeItem.type === "pool-field") {
      if (!overId.startsWith("col-")) return;
      const [, tabId, cardId, colIdxStr] = overId.split("-");
      const colIdx = Number(colIdxStr);
      if (activeTab && tabId === activeTab.id) {
        addField(tabId, cardId, activeItem.key, colIdx);
      }
      return;
    }

    if (activeItem.type === "field") {
      const activeLoc = findFieldContainer(tabs, activeId);
      if (!activeLoc) return;

      if (overId.startsWith("col-")) {
        const [, tabId, cardId, colIdxStr] = overId.split("-");
        setTabs((prev) => insertOrMoveField(prev, activeId, { tabId, cardId, colIdx: Number(colIdxStr), index: 999 }));
        return;
      }

      const overLoc = findFieldContainer(tabs, overId) ?? activeLoc;
      if (activeLoc.tabId !== overLoc.tabId || activeLoc.cardId !== overLoc.cardId) {
        setTabs((prev) => insertOrMoveField(prev, activeId, { tabId: overLoc.tabId, cardId: overLoc.cardId, colIdx: overLoc.colIdx, index: 999 }));
        return;
      }

      const card = tabs.find((t) => t.id === activeLoc.tabId)?.cards.find((c) => c.id === activeLoc.cardId);
      if (!card) return;
      const sameCol = card.fields.filter((f) => f.columnIndex === activeLoc.colIdx);
      const oldIndex = sameCol.findIndex((f) => f.id === activeId);
      const newIndex = sameCol.findIndex((f) => f.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(sameCol, oldIndex, newIndex).map((f, i) => ({ ...f, sortOrder: i }));
      const other = card.fields.filter((f) => f.columnIndex !== activeLoc.colIdx);
      setTabs(
        tabs.map((t) =>
          t.id === activeLoc.tabId
            ? { ...t, cards: t.cards.map((c) => (c.id === activeLoc.cardId ? { ...c, fields: [...other, ...reordered] } : c)) }
            : t
        )
      );
    }
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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
          <Button onClick={handleSave} disabled={saving || !canUpdateLayout}>
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
                <SortableContext items={tabs.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {tabs.map((tab) => (
                    <SortableTab
                      key={tab.id}
                      tab={tab}
                      active={activeTabId === tab.id}
                      onSelect={() => setActiveTabId(tab.id)}
                      onUpdate={(title) => updateTab(tab.id, title)}
                      onRemove={() => removeTab(tab.id)}
                    />
                  ))}
                </SortableContext>
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
                  <Button onClick={() => addCard(activeTab.id)} variant="outline" className="gap-1" disabled={!canUpdateLayout}>
                    <Plus className="h-4 w-4" />
                    Sektion
                  </Button>
                </div>

                <SortableContext items={activeTab.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  {activeTab.cards.map((card) => (
                    <SortableCard
                      key={card.id}
                      card={card}
                      tabId={activeTab.id}
                      allFields={allFields}
                      onUpdateTitle={(title) => updateCard(activeTab.id, card.id, { title })}
                      onUpdateColumns={(columns: 1 | 2 | 3) => updateCard(activeTab.id, card.id, { columns })}
                      onRemove={() => removeCard(activeTab.id, card.id)}
                      onRemoveField={(fieldId) => removeField(activeTab.id, card.id, fieldId)}
                    />
                  ))}
                </SortableContext>

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
                <Button onClick={() => setShowNewFieldDialog(true)} variant="outline" className="w-full gap-1" disabled={!canUpdateFields}>
                  <Plus className="h-4 w-4" />
                  Feld definieren
                </Button>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">Kernfelder</p>
                  {CORE_FIELDS.map((field) => (
                    <DraggablePoolItem
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
                      <DraggablePoolItem
                        key={field.id}
                        field={{ id: field.id, key: field.key, name: field.name, fieldType: field.fieldType }}
                        onAdd={() => activeTab?.cards[0] && addField(activeTab.id, activeTab.cards[activeTab.cards.length - 1].id, field.key)}
                        onDelete={canUpdateFields ? () => handleDeleteField(field.id) : undefined}
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

      <DragOverlay>
        {activeDragItem ? (
          <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 opacity-90 shadow-md">
            <GripVertical className="h-4 w-4 text-gray-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {activeDragItem.type === "tab"
                  ? activeDragItem.tab.title
                  : activeDragItem.type === "card"
                  ? activeDragItem.card.title
                  : activeDragItem.name}
              </p>
              {activeDragItem.type !== "tab" && activeDragItem.type !== "card" && (
                <p className="text-xs text-gray-500">{FIELD_TYPE_LABELS[activeDragItem.fieldType]}</p>
              )}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableTab({
  tab,
  active,
  onSelect,
  onUpdate,
  onRemove,
}: {
  tab: ProjectLayoutTab;
  active: boolean;
  onSelect: () => void;
  onUpdate: (title: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id, data: { type: "tab", tab } });
  const style = { transform: CSS.Translate.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 ${
        active ? "border-primary bg-primary/5" : "border-gray-200 hover:bg-gray-50"
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <span {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>
        <GripVertical className="h-4 w-4 text-gray-400" />
      </span>
      <Input
        value={tab.title}
        onChange={(e) => onUpdate(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className={`h-7 border-0 bg-transparent px-0 text-sm focus-visible:ring-0 ${active ? "font-medium" : ""}`}
      />
      <Button
        variant="outline"
        className="ml-auto h-6 w-6 p-0"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

function SortableCard({
  card,
  tabId,
  allFields,
  onUpdateTitle,
  onUpdateColumns,
  onRemove,
  onRemoveField,
}: {
  card: ProjectLayoutCard;
  tabId: string;
  allFields: { id: string; key: string; name: string; fieldType: CustomFieldType }[];
  onUpdateTitle: (title: string) => void;
  onUpdateColumns: (columns: 1 | 2 | 3) => void;
  onRemove: () => void;
  onRemoveField: (fieldId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id, data: { type: "card", card } });
  const style = { transform: CSS.Translate.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`${isDragging ? "opacity-50" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <span {...attributes} {...listeners}>
              <GripVertical className="h-5 w-5 text-gray-400" />
            </span>
            <Input
              value={card.title}
              onChange={(e) => onUpdateTitle(e.target.value)}
              className="h-8 max-w-sm border-0 bg-transparent px-0 text-base font-semibold focus-visible:ring-0"
            />
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-md border border-gray-200 p-0.5">
                <button
                  type="button"
                  title="1 Spalte"
                  onClick={() => onUpdateColumns(1)}
                  className={`flex h-7 w-8 items-center justify-center rounded text-sm ${card.columns === 1 ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  <Square className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="2 Spalten"
                  onClick={() => onUpdateColumns(2)}
                  className={`flex h-7 w-8 items-center justify-center rounded text-sm ${card.columns === 2 ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  <Columns2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="3 Spalten"
                  onClick={() => onUpdateColumns(3)}
                  className={`flex h-7 w-8 items-center justify-center rounded text-sm ${card.columns === 3 ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  <Columns3 className="h-4 w-4" />
                </button>
              </div>
              <Button variant="outline" className="h-7 w-7 p-0" onClick={onRemove}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className={`grid gap-6 ${card.columns === 1 ? "grid-cols-1" : card.columns === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {Array.from({ length: card.columns }).map((_, colIdx) => (
              <SortableContext
                key={colIdx}
                items={card.fields.filter((f) => f.columnIndex === colIdx).map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <DroppableColumn
                  tabId={tabId}
                  cardId={card.id}
                  colIdx={colIdx}
                  fields={card.fields.filter((f) => f.columnIndex === colIdx)}
                  allFields={allFields}
                  onRemove={onRemoveField}
                />
              </SortableContext>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DraggablePoolItem({
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
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id: field.key, data: { type: "pool-field", field } });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`group flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 ${isDragging ? "opacity-50" : ""}`}
    >
      <GripVertical className="h-4 w-4 text-gray-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{field.name}</p>
        <p className="text-xs text-gray-500">{FIELD_TYPE_LABELS[field.fieldType]}</p>
      </div>
      <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
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

function DroppableColumn({
  tabId,
  cardId,
  colIdx,
  fields,
  allFields,
  onRemove,
}: {
  tabId: string;
  cardId: string;
  colIdx: number;
  fields: ProjectLayoutField[];
  allFields: { id: string; key: string; name: string; fieldType: CustomFieldType }[];
  onRemove: (fieldId: string) => void;
}) {
  const { setNodeRef, isOver } = useSortable({ id: `col-${tabId}-${cardId}-${colIdx}`, data: { type: "column", tabId, cardId, colIdx } });

  return (
    <div
      ref={setNodeRef}
      className={`space-y-3 rounded-md border border-dashed border-gray-300 bg-gray-50/50 p-2 transition-colors ${
        isOver ? "border-primary bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center justify-between text-xs text-gray-400 px-1">
        <span>Spalte {colIdx + 1}</span>
        <span>{fields.length}</span>
      </div>
      <div className="space-y-2 min-h-[40px]">
        {fields.map((field) => {
          const def = allFields.find((f) => f.key === field.definitionId || f.id === field.definitionId);
          return <SortableFieldItem key={field.id} field={field} def={def} onRemove={onRemove} />;
        })}
      </div>
    </div>
  );
}

function SortableFieldItem({
  field,
  def,
  onRemove,
}: {
  field: ProjectLayoutField;
  def?: { id: string; key: string; name: string; fieldType: CustomFieldType };
  onRemove: (fieldId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id, data: { type: "field", field } });
  const style = { transform: CSS.Translate.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 ${isDragging ? "opacity-50" : ""}`}
    >
      <GripVertical className="h-4 w-4 text-gray-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{def?.name ?? field.definitionId}</p>
        <p className="text-xs text-gray-500">{def ? FIELD_TYPE_LABELS[def.fieldType] : "Unbekannt"}</p>
      </div>
      <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          className="h-7 w-7 p-0"
          onClick={() => onRemove(field.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
