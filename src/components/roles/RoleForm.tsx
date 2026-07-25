"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Permission } from "@prisma/client";

type RoleFormData = {
  name: string;
  description: string;
  permissions: string[];
};

export type RoleFormProps = {
  onSubmit: (data: RoleFormData) => void;
  error?: string | null;
  loading?: boolean;
  initial?: RoleFormData;
  availablePermissions: Permission[];
  onDelete?: () => void;
  isAdmin?: boolean;
  submitLabel?: string;
};

export default function RoleForm({
  onSubmit,
  error,
  loading,
  initial,
  availablePermissions,
  onDelete,
  isAdmin,
  submitLabel = "Speichern",
}: RoleFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    () => new Set(initial?.permissions ?? [])
  );

  const groupedPermissions = useMemo(() => {
    const map = new Map<string, Permission[]>();
    availablePermissions.forEach((permission) => {
      const group = permission.module || "Sonstige";
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(permission);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [availablePermissions]);

  function togglePermission(key: string) {
    if (isAdmin) return;
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      permissions: Array.from(selectedPermissions),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6"
    >
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          disabled={isAdmin}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
          placeholder="z. B. Personalverantwortliche"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Beschreibung
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          disabled={isAdmin}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
          placeholder="Optionale Beschreibung"
        />
      </div>

      <div className="space-y-4">
        <span className="block text-sm font-medium text-gray-700">Berechtigungen</span>
        {groupedPermissions.length === 0 ? (
          <p className="text-sm text-gray-500">Keine Berechtigungen verfügbar.</p>
        ) : (
          <div className="space-y-4">
            {groupedPermissions.map(([module, permissions]) => (
              <div key={module} className="rounded-lg border border-gray-200 p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  {module}
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {permissions.map((permission) => (
                    <label
                      key={permission.key}
                      className={`flex items-start space-x-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 ${
                        isAdmin ? "opacity-50" : "cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="permissions"
                        value={permission.key}
                        checked={selectedPermissions.has(permission.key)}
                        disabled={isAdmin}
                        onChange={() => togglePermission(permission.key)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                      />
                      <div>
                        <span className="block text-sm font-medium text-gray-900">
                          {permission.description || `${permission.resource}:${permission.action}`}
                        </span>
                        <span className="block text-xs text-gray-500">{permission.key}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div>
          {onDelete && !isAdmin && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              Löschen
            </button>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard/roles"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={loading || isAdmin || !name.trim()}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Speichern..." : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
