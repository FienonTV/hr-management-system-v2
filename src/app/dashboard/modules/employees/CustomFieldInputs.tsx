"use client";

import { useMemo } from "react";

interface CustomFieldDefinition {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  fieldType: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "MULTI_SELECT";
  isRequired: boolean;
  options: { values: string[] } | null;
  sortOrder: number;
}

interface CustomFieldInputsProps {
  fields: CustomFieldDefinition[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}

export default function CustomFieldInputs({ fields, values, onChange, disabled }: CustomFieldInputsProps) {
  const sortedFields = useMemo(() => [...fields].sort((a, b) => a.sortOrder - b.sortOrder), [fields]);

  if (sortedFields.length === 0) return null;

  return (
    <div className="space-y-4">
      {sortedFields.map((field) => {
        const value = values[field.key];
        const baseId = `custom-${field.key}`;
        const label = (
          <label htmlFor={baseId} className="block text-sm font-medium text-gray-700">
            {field.name}
            {field.isRequired && <span className="ml-1 text-red-500">*</span>}
          </label>
        );

        const commonClasses =
          "w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100";

        return (
          <div key={field.key} className="space-y-1">
            {label}
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
            {((): React.ReactNode => {
              switch (field.fieldType) {
                case "TEXT":
                  return (
                    <input
                      id={baseId}
                      type="text"
                      value={(value as string) ?? ""}
                      onChange={(e) => onChange(field.key, e.target.value)}
                      disabled={disabled}
                      className={commonClasses}
                    />
                  );
                case "NUMBER":
                  return (
                    <input
                      id={baseId}
                      type="number"
                      step="any"
                      value={(value as string | number) ?? ""}
                      onChange={(e) => onChange(field.key, e.target.value === "" ? null : Number(e.target.value))}
                      disabled={disabled}
                      className={commonClasses}
                    />
                  );
                case "DATE":
                  return (
                    <input
                      id={baseId}
                      type="date"
                      value={(value as string) ?? ""}
                      onChange={(e) => onChange(field.key, e.target.value || null)}
                      disabled={disabled}
                      className={commonClasses}
                    />
                  );
                case "BOOLEAN":
                  return (
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        id={baseId}
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => onChange(field.key, e.target.checked)}
                        disabled={disabled}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span>Ja</span>
                    </label>
                  );
                case "SELECT":
                  return (
                    <select
                      id={baseId}
                      value={(value as string) ?? ""}
                      onChange={(e) => onChange(field.key, e.target.value || null)}
                      disabled={disabled}
                      className={commonClasses}
                    >
                      <option value="">{field.isRequired ? "Bitte wählen" : "–"}</option>
                      {(field.options?.values ?? []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  );
                case "MULTI_SELECT": {
                  const selected = new Set(Array.isArray(value) ? (value as string[]) : []);
                  return (
                    <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      {(field.options?.values ?? []).map((option) => (
                        <label key={option} className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            value={option}
                            checked={selected.has(option)}
                            onChange={(e) => {
                              const next = new Set(selected);
                              if (e.target.checked) next.add(option);
                              else next.delete(option);
                              onChange(field.key, Array.from(next));
                            }}
                            disabled={disabled}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  );
                }
                default:
                  return null;
              }
            })()}
          </div>
        );
      })}
    </div>
  );
}
