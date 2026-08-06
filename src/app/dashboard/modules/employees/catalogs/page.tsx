"use client";

import { useEffect, useState } from "react";
import {
  getDepartments,
  getPositions,
  getPayGrades,
  getCustomFieldDefinitions,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createPosition,
  updatePosition,
  deletePosition,
  createPayGrade,
  updatePayGrade,
  deletePayGrade,
  createCustomFieldDefinition,
  updateCustomFieldDefinition,
  deleteCustomFieldDefinition,
} from "@/lib/actions/employeeCatalogs";
import type { CustomFieldType } from "@prisma/client";
import { Pencil, Trash2, Plus, Save, X } from "lucide-react";

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Zahl" },
  { value: "DATE", label: "Datum" },
  { value: "BOOLEAN", label: "Ja/Nein" },
  { value: "SELECT", label: "Einzelauswahl" },
  { value: "MULTI_SELECT", label: "Mehrfachauswahl" },
];

interface CustomFieldDefinition {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  fieldType: CustomFieldType;
  isRequired: boolean;
  options: { values: string[] } | null;
  sortOrder: number;
}

interface SimpleCatalogItem {
  id: string;
  name: string;
  description?: string | null;
}

export default function EmployeeCatalogsPage() {
  const [activeTab, setActiveTab] = useState<"departments" | "positions" | "payGrades" | "customFields">("departments");
  const [departments, setDepartments] = useState<SimpleCatalogItem[]>([]);
  const [positions, setPositions] = useState<SimpleCatalogItem[]>([]);
  const [payGrades, setPayGrades] = useState<SimpleCatalogItem[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    const [d, p, pg, cf] = await Promise.all([
      getDepartments(),
      getPositions(),
      getPayGrades(),
      getCustomFieldDefinitions("employee"),
    ]);
    setDepartments(d.map((x) => ({ id: x.id, name: x.name, description: (x as unknown as Record<string, string | null | undefined>).description })));
    setPositions(p.map((x) => ({ id: x.id, name: x.name, description: (x as unknown as Record<string, string | null | undefined>).description })));
    setPayGrades(pg.map((x) => ({ id: x.id, name: x.name, description: (x as unknown as Record<string, string | null | undefined>).description })));
    setCustomFields(cf as unknown as CustomFieldDefinition[]);
    setLoading(false);
  }

  const tabs = [
    { id: "departments", label: "Abteilungen" },
    { id: "positions", label: "Positionen" },
    { id: "payGrades", label: "Entgeltgruppen" },
    { id: "customFields", label: "Zusätzliche Felder" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Stammdaten-Kataloge</h1>
        <p className="mt-2 text-sm text-gray-600">Verwalten Sie Abteilungen, Positionen, Entgeltgruppen und zusätzliche Mitarbeiterfelder.</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {loading && <p className="text-gray-600">Laden...</p>}

      {!loading && activeTab === "departments" && (
        <SimpleCatalog
          title="Abteilungen"
          items={departments}
          fields={[{ key: "name", label: "Name", required: true }]}
          onCreate={async (data) => {
            const res = await createDepartment({ name: data.name, description: data.description });
            if (res.success) await refresh();
            return res;
          }}
          onUpdate={async (id, data) => {
            const res = await updateDepartment(id, { name: data.name, description: data.description });
            if (res.success) await refresh();
            return res;
          }}
          onDelete={async (id) => {
            const res = await deleteDepartment(id);
            if (res.success) await refresh();
            return res;
          }}
        />
      )}

      {!loading && activeTab === "positions" && (
        <SimpleCatalog
          title="Positionen"
          items={positions}
          fields={[{ key: "name", label: "Name", required: true }]}
          onCreate={async (data) => {
            const res = await createPosition({ name: data.name, description: data.description });
            if (res.success) await refresh();
            return res;
          }}
          onUpdate={async (id, data) => {
            const res = await updatePosition(id, { name: data.name, description: data.description });
            if (res.success) await refresh();
            return res;
          }}
          onDelete={async (id) => {
            const res = await deletePosition(id);
            if (res.success) await refresh();
            return res;
          }}
        />
      )}

      {!loading && activeTab === "payGrades" && (
        <SimpleCatalog
          title="Entgeltgruppen"
          items={payGrades}
          fields={[
            { key: "name", label: "Name", required: true },
            { key: "description", label: "Beschreibung", required: false },
          ]}
          onCreate={async (data) => {
            const res = await createPayGrade({ name: data.name, description: data.description });
            if (res.success) await refresh();
            return res;
          }}
          onUpdate={async (id, data) => {
            const res = await updatePayGrade(id, { name: data.name, description: data.description });
            if (res.success) await refresh();
            return res;
          }}
          onDelete={async (id) => {
            const res = await deletePayGrade(id);
            if (res.success) await refresh();
            return res;
          }}
        />
      )}

      {!loading && activeTab === "customFields" && (
        <CustomFieldCatalog
          items={customFields}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}

function SimpleCatalog<T extends { id: string; name: string; description?: string | null }>({
  title,
  items,
  fields,
  onCreate,
  onUpdate,
  onDelete,
}: {
  title: string;
  items: T[];
  fields: { key: keyof T; label: string; required: boolean }[];
  onCreate: (data: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
  onUpdate: (id: string, data: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) init[String(f.key)] = "";
    return init;
  });
  const [error, setError] = useState<string | null>(null);

  function reset() {
    const init: Record<string, string> = {};
    for (const f of fields) init[String(f.key)] = "";
    setForm(init);
    setEditing(null);
    setError(null);
  }

  async function handleSave() {
    setError(null);
    const data = { ...form };
    const res = editing ? await onUpdate(editing, data) : await onCreate(data);
    if (res.success) {
      reset();
    } else {
      setError(res.error || "Fehler beim Speichern");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" wirklich löschen?`)) return;
    const res = await onDelete(id);
    if (!res.success) setError(res.error || "Fehler beim Löschen");
  }

  function startEdit(item: T) {
    const next: Record<string, string> = {};
    for (const f of fields) next[String(f.key)] = String(item[f.key] ?? "");
    setForm(next);
    setEditing(item.id);
    setError(null);
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-medium text-gray-900">{title}</h2>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="flex flex-wrap items-end gap-3">
        {fields.map((f) => (
          <div key={String(f.key)} className="space-y-1">
            <label className="text-sm font-medium text-gray-700">{f.label}</label>
            <input
              type="text"
              value={form[String(f.key)] ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, [String(f.key)]: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        ))}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Save className="h-4 w-4" />
            {editing ? "Speichern" : "Hinzufügen"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              Abbrechen
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        {items.length === 0 && <p className="text-sm text-gray-500">Noch keine Einträge.</p>}
        <ul className="divide-y divide-gray-200">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                  aria-label="Bearbeiten"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id, item.name)}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  aria-label="Löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CustomFieldCatalog({
  items,
  onRefresh,
}: {
  items: CustomFieldDefinition[];
  onRefresh: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<CustomFieldDefinition | null>(null);
  const [form, setForm] = useState<{
    name: string;
    key: string;
    description: string;
    fieldType: CustomFieldDefinition["fieldType"];
    isRequired: boolean;
    sortOrder: string;
    options: string;
  }>({
    name: "",
    key: "",
    description: "",
    fieldType: "TEXT",
    isRequired: false,
    sortOrder: "0",
    options: "",
  });
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setEditing(null);
    setForm({
      name: "",
      key: "",
      description: "",
      fieldType: "TEXT",
      isRequired: false,
      sortOrder: String(items.length * 10),
      options: "",
    });
    setError(null);
  }

  useEffect(() => {
    if (!editing) {
      setForm((prev) => ({ ...prev, sortOrder: String(items.length * 10) }));
    }
  }, [items.length, editing]);

  function startEdit(field: CustomFieldDefinition) {
    setEditing(field);
    setForm({
      name: field.name,
      key: field.key,
      description: field.description ?? "",
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      sortOrder: String(field.sortOrder),
      options: field.options?.values.join("\n") ?? "",
    });
    setError(null);
  }

  async function handleSave() {
    setError(null);
    const data = {
      name: form.name.trim(),
      key: form.key.trim(),
      description: form.description.trim() || undefined,
      fieldType: form.fieldType,
      isRequired: form.isRequired,
      sortOrder: Number(form.sortOrder) || 0,
      options: ["SELECT", "MULTI_SELECT"].includes(form.fieldType)
        ? { values: form.options.split("\n").map((v) => v.trim()).filter(Boolean) }
        : undefined,
    };

    if (!data.name || !data.key) {
      setError("Name und Schlüssel sind Pflichtfelder.");
      return;
    }

    const res = editing
      ? await updateCustomFieldDefinition(editing.id, data)
      : await createCustomFieldDefinition({ ...data, appliesTo: "employee" });

    if (res.success) {
      await onRefresh();
      reset();
    } else {
      setError(res.error || "Fehler beim Speichern");
    }
  }

  async function handleDelete(field: CustomFieldDefinition) {
    if (!confirm(`Feld "${field.name}" wirklich löschen?`)) return;
    const res = await deleteCustomFieldDefinition(field.id);
    if (res.success) await onRefresh();
    else setError(res.error || "Fehler beim Löschen");
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-medium text-gray-900">Zusätzliche Felder</h2>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Schlüssel</label>
          <input
            type="text"
            value={form.key}
            disabled={!!editing}
            onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value.replace(/\s+/g, "_") }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium text-gray-700">Beschreibung</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Feldtyp</label>
          <select
            value={form.fieldType}
            onChange={(e) => setForm((prev) => ({ ...prev, fieldType: e.target.value as CustomFieldDefinition["fieldType"] }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Sortierung</label>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          <input
            id="isRequired"
            type="checkbox"
            checked={form.isRequired}
            onChange={(e) => setForm((prev) => ({ ...prev, isRequired: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="isRequired" className="text-sm font-medium text-gray-700">Pflichtfeld</label>
        </div>
        {["SELECT", "MULTI_SELECT"].includes(form.fieldType) && (
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Optionen (eine pro Zeile)</label>
            <textarea
              value={form.options}
              onChange={(e) => setForm((prev) => ({ ...prev, options: e.target.value }))}
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Save className="h-4 w-4" />
          {editing ? "Speichern" : "Hinzufügen"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            Abbrechen
          </button>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4">
        {items.length === 0 && <p className="text-sm text-gray-500">Noch keine zusätzlichen Felder.</p>}
        <ul className="divide-y divide-gray-200">
          {items
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((field) => (
              <li key={field.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{field.name}</p>
                  <p className="text-xs text-gray-500">
                    {field.key} · {FIELD_TYPES.find((t) => t.value === field.fieldType)?.label}
                    {field.isRequired && " · Pflichtfeld"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(field)}
                    className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                    aria-label="Bearbeiten"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(field)}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    aria-label="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
