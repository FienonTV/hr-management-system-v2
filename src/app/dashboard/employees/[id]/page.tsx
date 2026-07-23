"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  position: string | null;
  department: string | null;
  startDate: string | null;
};

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { id } = await params;
        const res = await fetch(`/api/employees/${id}`);
        if (!res.ok) throw new Error("Mitarbeiter nicht gefunden");
        const data = await res.json();
        if (!cancelled) setEmployee(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Fehler beim Laden");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [params]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!employee) return;
    setSaving(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const data = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? "") || undefined,
      position: String(formData.get("position") ?? "") || undefined,
      department: String(formData.get("department") ?? "") || undefined,
      startDate: String(formData.get("startDate") ?? "") || undefined,
    };

    try {
      const { id } = await params;
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Fehler beim Speichern");
      }
      router.push("/dashboard/employees");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!employee) return;
    if (!confirm(`Mitarbeiter ${employee.firstName} ${employee.lastName} wirklich löschen?`)) return;

    try {
      const { id } = await params;
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Fehler beim Löschen");
      }
      router.push("/dashboard/employees");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Löschen");
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-gray-600">Laden...</p>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error || "Mitarbeiter nicht gefunden"}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mitarbeiter bearbeiten</h1>
          <p className="mt-2 text-sm text-gray-600">
            Bearbeiten Sie die Informationen von {employee.firstName} {employee.lastName}.
          </p>
        </div>
        <Link
          href="/dashboard/employees"
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          ← Zurück zur Übersicht
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6"
      >
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              Vorname
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              defaultValue={employee.firstName}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Nachname
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              defaultValue={employee.lastName}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            E-Mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={employee.email || ""}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="position" className="block text-sm font-medium text-gray-700">
              Position
            </label>
            <input
              id="position"
              name="position"
              type="text"
              defaultValue={employee.position || ""}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">
              Abteilung
            </label>
            <input
              id="department"
              name="department"
              type="text"
              defaultValue={employee.department || ""}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
            Startdatum
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={employee.startDate ? employee.startDate.split("T")[0] : ""}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Löschen
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </form>
    </div>
  );
}
