"use client";

import { useState, useMemo } from "react";
import type { CustomFieldDefinition } from "@prisma/client";
import type { ProjectLayoutTab, ProjectLayoutCard, ProjectLayoutField } from "@/lib/projectLayout";
import { DEFAULT_PROJECT_LAYOUT } from "@/lib/projectLayout";
import { saveProjectLayout } from "@/lib/actions/projectLayouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, GripVertical, Save, LayoutTemplate } from "lucide-react";
import { useRouter } from "next/navigation";

const CORE_FIELDS = [
  { key: "code", name: "Projektnummer", type: "TEXT" },
  { key: "name", name: "Bezeichnung", type: "TEXT" },
  { key: "description", name: "Beschreibung", type: "TEXT" },
];

export default function ProjectLayoutEditorClient({
  initialTabs,
  fieldDefinitions,
}: {
  initialTabs?: ProjectLayoutTab[];
  fieldDefinitions: CustomFieldDefinition[];
}) {
  const router = useRouter();
  const [tabs, setTabs] = useState<ProjectLayoutTab[]>(
    initialTabs?.length ? initialTabs : DEFAULT_PROJECT_LAYOUT
  );
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const usedFieldIds = useMemo(() => {
    const ids = new Set<string>();
    tabs.forEach((tab) => tab.cards.forEach((card) => card.fields.forEach((f) => ids.add(f.definitionId))));
    return ids;
  }, [tabs]);

  function addTab() {
    const newTab: ProjectLayoutTab = {
      id: crypto.randomUUID(),
      title: `Tab ${tabs.length + 1}`,
      sortOrder: tabs.length,
      cards: [],
    };
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
        const newCard: ProjectLayoutCard = {
          id: crypto.randomUUID(),
          title: "Neue Card",
          columns: 2,
          sortOrder: t.cards.length,
          fields: [],
        };
        return { ...t, cards: [...t.cards, newCard] };
      })
    );
  }

  function updateCard(tabId: string, cardId: string, updates: Partial<ProjectLayoutCard>) {
    setTabs(
      tabs.map((t) => {
        if (t.id !== tabId) return t;
        return {
          ...t,
          cards: t.cards.map((c) => (c.id === cardId ? { ...c, ...updates } : c)),
        };
      })
    );
  }

  function removeCard(tabId: string, cardId: string) {
    setTabs(
      tabs.map((t) => {
        if (t.id !== tabId) return t;
        return { ...t, cards: t.cards.filter((c) => c.id !== cardId) };
      })
    );
  }

  function addField(tabId: string, cardId: string, definitionId: string) {
    setTabs(
      tabs.map((t) => {
        if (t.id !== tabId) return t;
        return {
          ...t,
          cards: t.cards.map((c) => {
            if (c.id !== cardId) return c;
            const columnIndex = 0;
            const newField: ProjectLayoutField = {
              id: crypto.randomUUID(),
              definitionId,
              columnIndex,
              sortOrder: c.fields.length,
            };
            return { ...c, fields: [...c.fields, newField] };
          }),
        };
      })
    );
  }

  function removeField(tabId: string, cardId: string, fieldId: string) {
    setTabs(
      tabs.map((t) => {
        if (t.id !== tabId) return t;
        return {
          ...t,
          cards: t.cards.map((c) => {
            if (c.id !== cardId) return c;
            return { ...c, fields: c.fields.filter((f) => f.id !== fieldId) };
          }),
        };
      })
    );
  }

  function moveField(tabId: string, cardId: string, fieldId: string, newColumnIndex: number) {
    setTabs(
      tabs.map((t) => {
        if (t.id !== tabId) return t;
        return {
          ...t,
          cards: t.cards.map((c) => {
            if (c.id !== cardId) return c;
            return {
              ...c,
              fields: c.fields.map((f) =>
                f.id === fieldId ? { ...f, columnIndex: Math.max(0, Math.min(newColumnIndex, c.columns - 1)) } : f
              ),
            };
          }),
        };
      })
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const res = await saveProjectLayout(tabs);
    if (res.success) {
      setMessage("Layout gespeichert.");
      router.refresh();
    } else {
      setMessage(res.error);
    }
    setSaving(false);
  }

  const allFields = [
    ...CORE_FIELDS.map((f) => ({ id: f.key, key: f.key, name: f.name, fieldType: f.type as CustomFieldDefinition["fieldType"] })),
    ...fieldDefinitions
      .filter((d) => d.appliesTo === "project")
      .map((d) => ({ id: d.id, key: d.key, name: d.name, fieldType: d.fieldType })),
  ];

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Projekt-Layout-Editor</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Speichern..." : "Layout speichern"}
        </Button>
      </div>

      {message && <p className={`text-sm ${message.includes("Fehler") || message.includes("erforderlich") || message.includes("Doppelte") || message.includes("außerhalb") ? "text-red-600" : "text-green-600"}`}>{message}</p>}

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Tabs */}
        <div className="w-56 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Tabs</span>
            <Button variant="outline" className="h-8 px-2" onClick={addTab}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-1 overflow-y-auto flex-1">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer ${activeTabId === tab.id ? "bg-primary/10 border-primary" : ""}`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={tab.title}
                  onChange={(e) => updateTab(tab.id, e.target.value)}
                  className="h-7 border-0 bg-transparent px-0 focus-visible:ring-0"
                />
                <Button variant="outline" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Active tab editor */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {activeTab ? (
            <>
              <div className="flex items-center justify-between">
                <span className="font-medium">{activeTab.title}</span>
                <Button onClick={() => addCard(activeTab.id)} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Card hinzufügen
                </Button>
              </div>

              {activeTab.cards.map((card) => (
                <Card key={card.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-4">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <Input
                        value={card.title}
                        onChange={(e) => updateCard(activeTab.id, card.id, { title: e.target.value })}
                        className="h-8 font-semibold"
                      />
                      <div className="flex items-center gap-2 ml-auto">
                        <Label className="text-sm whitespace-nowrap">Spalten:</Label>
                        <select
                          value={card.columns}
                          onChange={(e) => updateCard(activeTab.id, card.id, { columns: Number(e.target.value) as 1 | 2 | 3 })}
                          className="h-8 rounded-md border px-2"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                        </select>
                        <Button variant="outline" className="p-1" onClick={() => removeCard(activeTab.id, card.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={`grid gap-4 ${card.columns === 1 ? "grid-cols-1" : card.columns === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                      {Array.from({ length: card.columns }).map((_, colIdx) => (
                        <div key={colIdx} className="space-y-2">
                          <span className="text-xs text-muted-foreground">Spalte {colIdx + 1}</span>
                          {card.fields
                            .filter((f) => f.columnIndex === colIdx)
                            .map((field) => {
                              const def = allFields.find((f) => f.key === field.definitionId);
                              return (
                                <div key={field.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                                  <span className="text-sm">{def?.name ?? field.definitionId}</span>
                                  <div className="flex items-center gap-1">
                                    {card.columns > 1 && (
                                      <select
                                        value={field.columnIndex}
                                        onChange={(e) => moveField(activeTab.id, card.id, field.id, Number(e.target.value))}
                                        className="h-7 rounded-md border px-1 text-xs"
                                      >
                                        {Array.from({ length: card.columns }).map((_, i) => (
                                          <option key={i} value={i}>Spalte {i + 1}</option>
                                        ))}
                                      </select>
                                    )}
                                    <Button variant="outline" className="h-6 w-6 p-0" onClick={() => removeField(activeTab.id, card.id, field.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <p className="text-muted-foreground">Kein Tab ausgewählt.</p>
          )}
        </div>

        {/* Field pool */}
        <div className="w-64 flex flex-col gap-2">
          <span className="text-sm font-medium">Feld-Pool</span>
          <div className="flex-1 overflow-y-auto space-y-1 rounded-md border p-2">
            {allFields.map((field) => {
              const used = usedFieldIds.has(field.key);
              const canAdd = activeTab && activeTab.cards.length > 0;
              return (
                <div
                  key={field.key}
                  className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${used ? "bg-muted text-muted-foreground" : "hover:bg-accent"}`}
                >
                  <span>{field.name}</span>
                  {!used && canAdd && (
                    <Button
                      variant="outline"
                      className="h-6 w-6 p-0"
                      onClick={() => addField(activeTab.id, activeTab.cards[activeTab.cards.length - 1].id, field.key)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Klicken Sie auf +, um ein Feld zur letzten Card des aktiven Tabs hinzuzufügen.
          </p>
        </div>
      </div>
    </div>
  );
}
