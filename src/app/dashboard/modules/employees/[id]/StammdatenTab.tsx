"use client";

import { Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateEmployee, deleteEmployee } from "@/lib/actions/employees";
import type { Employee } from "./types";
import { Field, toDateInputValue } from "./Field";

export default function StammdatenTab({ employee }: { employee: Employee }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const data: Record<string, unknown> = {};

    const stringFields = [
      "firstName",
      "lastName",
      "email",
      "employeeNumber",
      "position",
      "department",
      "employmentType",
      "status",
      "phone",
      "gender",
      "street",
      "zip",
      "city",
      "country",
      "taxId",
      "socialSecurityNumber",
      "iban",
      "bic",
      "emergencyContactName",
      "emergencyContactPhone",
      "notes",
    ];

    for (const key of stringFields) {
      const value = formData.get(key);
      if (value !== null && value !== "") {
        data[key] = String(value);
      }
    }

    const dateFields = ["birthDate", "startDate", "exitDate"];
    for (const key of dateFields) {
      const value = formData.get(key);
      if (value && String(value) !== "") {
        data[key] = new Date(String(value)).toISOString();
      }
    }

    try {
      const result = await updateEmployee(employee.id, data);
      if (!result.success) {
        throw new Error(result.error || "Fehler beim Speichern");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Mitarbeiter ${employee.firstName} ${employee.lastName} wirklich löschen?`)) return;

    try {
      const result = await deleteEmployee(employee.id);
      if (!result.success) {
        throw new Error(result.error || "Fehler beim Löschen");
      }
      router.push("/dashboard/modules/employees");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Löschen");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6">
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Vorname" name="firstName" defaultValue={employee.firstName} required />
        <Field label="Nachname" name="lastName" defaultValue={employee.lastName} required />
        <Field label="E-Mail" name="email" type="email" defaultValue={employee.email ?? ""} />
        <Field label="Mitarbeiternummer" name="employeeNumber" defaultValue={employee.employeeNumber ?? ""} />
        <Field label="Position" name="position" defaultValue={employee.position ?? ""} />
        <Field label="Abteilung" name="department" defaultValue={employee.department ?? ""} />

        <div className="space-y-2">
          <label htmlFor="employmentType" className="block text-sm font-medium text-gray-700">Beschäftigungsart</label>
          <select
            id="employmentType"
            name="employmentType"
            defaultValue={employee.employmentType ?? "FULL_TIME"}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="FULL_TIME">Vollzeit</option>
            <option value="PART_TIME">Teilzeit</option>
            <option value="FREELANCE">Freelancer</option>
            <option value="INTERN">Praktikum</option>
            <option value="APPRENTICE">Auszubildender</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
          <select
            id="status"
            name="status"
            defaultValue={employee.status ?? "ACTIVE"}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ACTIVE">Aktiv</option>
            <option value="ONBOARDING">Einstellung</option>
            <option value="INACTIVE">Inaktiv</option>
            <option value="TERMINATED">Ausgeschieden</option>
          </select>
        </div>

        <Field label="Telefon" name="phone" defaultValue={employee.phone ?? ""} />

        <div className="space-y-2">
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Geschlecht</label>
          <select
            id="gender"
            name="gender"
            defaultValue={employee.gender ?? "NOT_SPECIFIED"}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="MALE">Männlich</option>
            <option value="FEMALE">Weiblich</option>
            <option value="DIVERS">Divers</option>
            <option value="NOT_SPECIFIED">Nicht angegeben</option>
          </select>
        </div>

        <Field label="Geburtsdatum" name="birthDate" type="date" defaultValue={toDateInputValue(employee.birthDate)} />
        <Field label="Eintrittsdatum" name="startDate" type="date" defaultValue={toDateInputValue(employee.startDate)} />
        <Field label="Austrittsdatum" name="exitDate" type="date" defaultValue={toDateInputValue(employee.exitDate)} />
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900">Adresse & Bankverbindung</h3>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Straße" name="street" defaultValue={employee.street ?? ""} />
          <Field label="PLZ" name="zip" defaultValue={employee.zip ?? ""} />
          <Field label="Ort" name="city" defaultValue={employee.city ?? ""} />
          <Field label="Land" name="country" defaultValue={employee.country ?? ""} />
          <Field label="Steuer-ID" name="taxId" defaultValue={employee.taxId ?? ""} />
          <Field label="Sozialversicherungsnummer" name="socialSecurityNumber" defaultValue={employee.socialSecurityNumber ?? ""} />
          <Field label="IBAN" name="iban" defaultValue={employee.iban ?? ""} />
          <Field label="BIC" name="bic" defaultValue={employee.bic ?? ""} />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900">Notfallkontakt</h3>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="Name" name="emergencyContactName" defaultValue={employee.emergencyContactName ?? ""} />
          <Field label="Telefon" name="emergencyContactPhone" defaultValue={employee.emergencyContactPhone ?? ""} />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notizen</label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={employee.notes ?? ""}
          className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center space-x-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          <span>Löschen</span>
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? "Speichern..." : "Speichern"}</span>
        </button>
      </div>
    </form>
  );
}
