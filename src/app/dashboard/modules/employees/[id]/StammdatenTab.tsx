"use client";

import { Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateEmployee, deleteEmployee } from "@/lib/actions/employees";
import type { Employee } from "./types";
import { Field, toDateInputValue } from "./Field";
import CustomFieldInputs from "../CustomFieldInputs";
import type { CustomFieldType } from "@prisma/client";

export interface StammdatenTabProps {
  employee: Employee;
  departments: { id: string; name: string }[];
  positions: { id: string; name: string }[];
  payGrades: { id: string; name: string }[];
  customFields: {
    id: string;
    key: string;
    name: string;
    description?: string | null;
    fieldType: CustomFieldType;
    isRequired: boolean;
    options: { values: string[] } | null;
    sortOrder: number;
  }[];
}

export default function StammdatenTab({ employee, departments, positions, payGrades, customFields }: StammdatenTabProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const def of customFields) {
      init[def.key] = employee[def.key as keyof Employee] ?? null;
    }
    return init;
  });

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
      "keyNumber",
      "chipNumber",
      "driverLicenseClasses",
      "notes",
    ];

    for (const key of stringFields) {
      const value = formData.get(key);
      if (value !== null && value !== "") {
        data[key] = String(value);
      }
    }

    for (const key of ["departmentId", "positionId", "payGradeId"]) {
      const value = formData.get(key);
      if (value && value !== "") {
        data[key] = String(value);
      } else {
        data[key] = null;
      }
    }

    const decimalFields = ["hourlyWage"];
    for (const key of decimalFields) {
      const value = formData.get(key);
      if (value && value !== "") {
        data[key] = Number(String(value).replace(",", "."));
      } else {
        data[key] = null;
      }
    }

    const intFields = ["vacationDays"];
    for (const key of intFields) {
      const value = formData.get(key);
      if (value && value !== "") {
        data[key] = Number(String(value));
      } else {
        data[key] = null;
      }
    }

    const boolFields = ["forkliftLicense"];
    for (const key of boolFields) {
      data[key] = formData.get(key) === "on";
    }

    const dateFields = ["birthDate", "startDate", "exitDate", "probationEndDate", "fixedTermEndDate"];
    for (const key of dateFields) {
      const value = formData.get(key);
      if (value && String(value) !== "") {
        data[key] = new Date(String(value)).toISOString();
      } else {
        data[key] = null;
      }
    }

    for (const [key, value] of Object.entries(customValues)) {
      data[key] = value;
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

        <div className="space-y-2">
          <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700">Abteilung</label>
          <select
            id="departmentId"
            name="departmentId"
            defaultValue={employee.departmentId ?? ""}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">–</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="positionId" className="block text-sm font-medium text-gray-700">Position</label>
          <select
            id="positionId"
            name="positionId"
            defaultValue={employee.positionId ?? ""}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">–</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="payGradeId" className="block text-sm font-medium text-gray-700">Entgeltgruppe</label>
          <select
            id="payGradeId"
            name="payGradeId"
            defaultValue={employee.payGradeId ?? ""}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">–</option>
            {payGrades.map((pg) => (
              <option key={pg.id} value={pg.id}>
                {pg.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="employmentType" className="block text-sm font-medium text-gray-700">Beschäftigungsart</label>
          <select
            id="employmentType"
            name="employmentType"
            defaultValue={employee.employmentType ?? ""}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">–</option>
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
            defaultValue={employee.status ?? ""}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">–</option>
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
            defaultValue={employee.gender ?? ""}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">–</option>
            <option value="MALE">Männlich</option>
            <option value="FEMALE">Weiblich</option>
            <option value="DIVERS">Divers</option>
            <option value="NOT_SPECIFIED">Nicht angegeben</option>
          </select>
        </div>

        <Field label="Geburtsdatum" name="birthDate" type="date" defaultValue={toDateInputValue(employee.birthDate)} />
        <Field label="Eintrittsdatum" name="startDate" type="date" defaultValue={toDateInputValue(employee.startDate)} />
        <Field label="Austrittsdatum" name="exitDate" type="date" defaultValue={toDateInputValue(employee.exitDate)} />
        <Field label="Probezeit bis" name="probationEndDate" type="date" defaultValue={toDateInputValue((employee as unknown as Record<string, unknown>).probationEndDate as string | null)} />
        <Field label="Befristet bis" name="fixedTermEndDate" type="date" defaultValue={toDateInputValue((employee as unknown as Record<string, unknown>).fixedTermEndDate as string | null)} />
        <Field label="Stundensatz" name="hourlyWage" type="number" defaultValue={String(((employee as unknown as Record<string, unknown>).hourlyWage as number | null) ?? "")} />
        <Field label="Urlaubstage" name="vacationDays" type="number" defaultValue={String(((employee as unknown as Record<string, unknown>).vacationDays as number | null) ?? "")} />
        <Field label="Schlüsselnummer" name="keyNumber" defaultValue={((employee as unknown as Record<string, unknown>).keyNumber as string | null) ?? ""} />
        <Field label="Chipnummer" name="chipNumber" defaultValue={((employee as unknown as Record<string, unknown>).chipNumber as string | null) ?? ""} />
        <Field label="Führerscheinklassen" name="driverLicenseClasses" defaultValue={((employee as unknown as Record<string, unknown>).driverLicenseClasses as string | null) ?? ""} />

        <div className="flex items-center gap-2">
          <input
            id="forkliftLicense"
            name="forkliftLicense"
            type="checkbox"
            defaultChecked={!!((employee as unknown as Record<string, unknown>).forkliftLicense)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="forkliftLicense" className="text-sm font-medium text-gray-700">Gabelstaplerschein</label>
        </div>
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

      {customFields.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900">Zusätzliche Felder</h3>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <CustomFieldInputs
              fields={customFields}
              values={customValues}
              onChange={(key, value) => setCustomValues((prev) => ({ ...prev, [key]: value }))}
              disabled={saving}
            />
          </div>
        </div>
      )}

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
