"use client";

import { useState } from "react";
import type { CustomFieldDefinition } from "@prisma/client";
import type { ProjectLayoutTab } from "@/lib/projectLayout";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CORE_FIELD_CONFIG: Record<string, { label: string; type: "text" | "textarea" }> = {
  code: { label: "Projektnummer", type: "text" },
  name: { label: "Bezeichnung", type: "text" },
  description: { label: "Beschreibung", type: "textarea" },
};

function SingleFieldInput({
  definition,
  value,
  onChange,
  disabled,
}: {
  definition:
    | { key: string; name: string; type: "text" | "textarea" }
    | { key: string; name: string; fieldType: CustomFieldDefinition["fieldType"]; options?: { values?: string[] } | null };
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const isCore = "type" in definition;
  const type = isCore ? definition.type : undefined;
  const fieldType = isCore ? undefined : definition.fieldType;

  if (type === "textarea") {
    return (
      <textarea
        className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={definition.name}
      />
    );
  }

  if (fieldType === "BOOLEAN") {
    return (
      <input
        type="checkbox"
        className="rounded"
        checked={value === true || value === "true"}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
    );
  }

  if (fieldType === "DATE") {
    return (
      <Input
        type="date"
        value={value ? new Date(value as string).toISOString().split("T")[0] : ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
      />
    );
  }

  if (fieldType === "NUMBER") {
    return (
      <Input
        type="number"
        value={value != null ? String(value) : ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        disabled={disabled}
      />
    );
  }

  if (fieldType === "SELECT" || fieldType === "MULTI_SELECT") {
    const options = (definition as { options?: { values?: string[] } | null }).options?.values ?? [];
    if (fieldType === "MULTI_SELECT") {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded"
                checked={selected.includes(opt)}
                onChange={(e) => {
                  const next = e.target.checked ? [...selected, opt] : selected.filter((s) => s !== opt);
                  onChange(next);
                }}
                disabled={disabled}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }
    return (
      <select
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
      >
        <option value="">–</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (fieldType === "TEXTAREA") {
    return (
      <textarea
        className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={definition.name}
      />
    );
  }

  return (
    <Input
      type="text"
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={definition.name}
    />
  );
}

export default function ProjectFormRenderer({
  tabs,
  fieldDefinitions,
  values,
  onChange,
  disabled,
}: {
  tabs: ProjectLayoutTab[];
  fieldDefinitions: CustomFieldDefinition[];
  values: Record<string, unknown>;
  onChange?: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id ?? "");
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const defByKey = new Map(fieldDefinitions.map((d) => [d.key, d]));

  function resolveDefinition(definitionId: string) {
    if (CORE_FIELD_CONFIG[definitionId]) {
      return {
        key: definitionId,
        name: CORE_FIELD_CONFIG[definitionId].label,
        type: CORE_FIELD_CONFIG[definitionId].type,
      };
    }
    const def = defByKey.get(definitionId);
    if (!def) return { key: definitionId, name: definitionId, fieldType: "TEXT" as const };
    return {
      key: def.key,
      name: def.name,
      fieldType: def.fieldType,
      options: (def.options as { values?: string[] } | null) ?? undefined,
    };
  }

  return (
    <div className="space-y-4">
      {tabs.length > 1 && (
        <div className="flex gap-2 border-b pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={`px-4 py-2 text-sm font-medium ${activeTabId === tab.id ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
            >
              {tab.title}
            </button>
          ))}
        </div>
      )}

      {activeTab ? (
        <div className="space-y-6">
          {activeTab.cards.map((card) => (
            <Card key={card.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{card.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div
                  className={`grid gap-6 ${
                    card.columns === 1 ? "grid-cols-1" : card.columns === 2 ? "grid-cols-2" : "grid-cols-3"
                  }`}
                >
                  {Array.from({ length: card.columns }).map((_, colIdx) => (
                    <div key={colIdx} className="space-y-4">
                      {card.fields
                        .filter((f) => f.columnIndex === colIdx)
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((field) => {
                          const def = resolveDefinition(field.definitionId);
                          return (
                            <div key={field.id} className="space-y-1.5">
                              <Label className="text-sm">{def.name}</Label>
                              <SingleFieldInput
                                definition={def as any}
                                value={values[field.definitionId]}
                                onChange={(val) => onChange?.(field.definitionId, val)}
                              />
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Keine Tabs konfiguriert.</p>
      )}
    </div>
  );
}
