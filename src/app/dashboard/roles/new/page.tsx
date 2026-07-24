"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewRolePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || undefined;
    const permissionKeys = Array.from(formData.getAll("permissions") as Iterable<string>);

    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, permissionKeys }),
      });

      const text = await response.text();
      const result = text ? (JSON.parse(text) as { error?: string }) : {};

      if (!response.ok) {
        setError(result.error || `Fehler beim Speichern (${response.status})`);
        setLoading(false);
        return;
      }

      router.push("/dashboard/roles");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Neue Rolle</h1>
          <p className="mt-2 text-sm text-gray-600">Erstellen Sie eine neue Rolle mit Berechtigungen.</p>
        </div>
      </div>

      <RoleForm onSubmit={handleSubmit} error={error} loading={loading} />
    </div>
  );
}

function RoleForm({
  onSubmit,
  error,
  loading,
  initial,
  onDelete,
  isAdmin,
}: {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  error: string | null;
  loading: boolean;
  initial?: {
    name: string;
    description: string | null;
    permissions: string[];
  };
  onDelete?: () => void;
  isAdmin?: boolean;
}) {
  const permissions = [
    { key: "employees:read", label: "Mitarbeiter anzeigen" },
    { key: "employees:create", label: "Mitarbeiter erstellen" },
    { key: "employees:update", label: "Mitarbeiter bearbeiten" },
    { key: "employees:delete", label: "Mitarbeiter löschen" },
    { key: "roles:read", label: "Rollen anzeigen" },
    { key: "roles:create", label: "Rollen erstellen" },
    { key: "roles:update", label: "Rollen bearbeiten" },
    { key: "roles:delete", label: "Rollen löschen" },
    { key: "audit:read", label: "Audit-Log anzeigen" },
    { key: "users:read", label: "Benutzer anzeigen" },
    { key: "users:update", label: "Benutzer bearbeiten" },
  ];

  return (
    <form
      onSubmit={onSubmit}
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
          defaultValue={initial?.name ?? ""}
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
          defaultValue={initial?.description ?? ""}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Optionale Beschreibung"
        />
      </div>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-gray-700">Berechtigungen</span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {permissions.map((permission) => (
            <label
              key={permission.key}
              className="flex items-start space-x-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                name="permissions"
                value={permission.key}
                defaultChecked={initial?.permissions.includes(permission.key)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="block text-sm font-medium text-gray-900">{permission.label}</span>
                <span className="block text-xs text-gray-500">{permission.key}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div>
          {onDelete && (
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
            disabled={loading || isAdmin}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </div>
    </form>
  );
}
