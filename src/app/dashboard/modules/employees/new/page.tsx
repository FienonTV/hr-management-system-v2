"use client";

import { useState } from "react";
import Link from "next/link";
import { createEmployee } from "@/lib/actions/employees";
import { getRoles } from "@/lib/actions/roles";
import type { CreateEmployeeInput } from "@/lib/schemas/employees";
import { useEffect } from "react";

type Role = { id: string; name: string };

export default function NewEmployeePage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [createUser, setCreateUser] = useState(false);
  const [userRoleIds, setUserRoleIds] = useState<string[]>([]);
  const [createdTemporaryPassword, setCreatedTemporaryPassword] = useState<string | null>(null);
  const [createdEmployeeId, setCreatedEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    getRoles().then(setRoles).catch(console.error);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const data = {
      employeeNumber: String(formData.get("employeeNumber") ?? "") || undefined,
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? "") || undefined,
      phone: String(formData.get("phone") ?? "") || undefined,
      position: String(formData.get("position") ?? "") || undefined,
      department: String(formData.get("department") ?? "") || undefined,
      employmentType: (String(formData.get("employmentType") ?? "") || undefined) as CreateEmployeeInput["employmentType"],
      status: (String(formData.get("status") ?? "") || undefined) as CreateEmployeeInput["status"],
      birthDate: String(formData.get("birthDate") ?? "") || undefined,
      gender: (String(formData.get("gender") ?? "") || undefined) as CreateEmployeeInput["gender"],
      startDate: String(formData.get("startDate") ?? "") || undefined,
      street: String(formData.get("street") ?? "") || undefined,
      zip: String(formData.get("zip") ?? "") || undefined,
      city: String(formData.get("city") ?? "") || undefined,
      country: String(formData.get("country") ?? "") || undefined,
      taxId: String(formData.get("taxId") ?? "") || undefined,
      socialSecurityNumber: String(formData.get("socialSecurityNumber") ?? "") || undefined,
      iban: String(formData.get("iban") ?? "") || undefined,
      bic: String(formData.get("bic") ?? "") || undefined,
      emergencyContactName: String(formData.get("emergencyContactName") ?? "") || undefined,
      emergencyContactPhone: String(formData.get("emergencyContactPhone") ?? "") || undefined,
      notes: String(formData.get("notes") ?? "") || undefined,
      createUserAccount: createUser,
      userRoleIds: createUser ? userRoleIds : undefined,
    };

    try {
      const result = await createEmployee(data);
      if (!result.success) {
        setError(result.error || "Fehler beim Speichern");
        setLoading(false);
        return;
      }

      setCreatedTemporaryPassword(result.temporaryPassword || null);
      setCreatedEmployeeId(result.employeeId || null);
      form.reset();
      setCreateUser(false);
      setUserRoleIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Neuer Mitarbeiter</h1>
          <p className="mt-2 text-sm text-gray-600">Geben Sie die Details des neuen Mitarbeiters ein.</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6"
      >
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {createdTemporaryPassword && createdEmployeeId && (
          <div className="rounded-md bg-green-50 border border-green-200 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <div className="text-sm text-green-800">
                <p className="font-medium">Mitarbeiter und Benutzer-Account wurden angelegt.</p>
                <p className="mt-1">Teilen Sie dem Benutzer das temporäre Passwort sicher mit. Beim ersten Login muss er ein neues Passwort setzen.</p>
              </div>
            </div>

            <div className="rounded-lg border border-green-300 bg-white p-3">
              <p className="text-xs font-medium text-gray-500 uppercase">Temporäres Passwort</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <code className="text-lg font-mono text-gray-900 break-all">{createdTemporaryPassword}</code>
                <button
                  type="button"
                  onClick={() => {
                    if (createdTemporaryPassword) {
                      navigator.clipboard.writeText(createdTemporaryPassword);
                    }
                  }}
                  className="shrink-0 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                >
                  Kopieren
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href={`/dashboard/modules/employees/${createdEmployeeId}`}
                className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
              >
                Zur Mitarbeiter-Detailseite
              </Link>
              <Link
                href="/dashboard/modules/employees"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Zur Übersicht
              </Link>
            </div>
          </div>
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
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Vorname"
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
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Nachname"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="employeeNumber" className="block text-sm font-medium text-gray-700">
              Mitarbeiternummer
            </label>
            <input
              id="employeeNumber"
              name="employeeNumber"
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Mitarbeiternummer"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Telefon
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Telefon"
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
            required={createUser}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="E-Mail"
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
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Position"
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
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Abteilung"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="employmentType" className="block text-sm font-medium text-gray-700">
              Beschäftigungsart
            </label>
            <select
              id="employmentType"
              name="employmentType"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Bitte wählen</option>
              <option value="FULL_TIME">Vollzeit</option>
              <option value="PART_TIME">Teilzeit</option>
              <option value="FREELANCE">Freelancer</option>
              <option value="INTERN">Praktikant</option>
              <option value="APPRENTICE">Auszubildender</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              name="status"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ACTIVE">Aktiv</option>
              <option value="ONBOARDING">Einstellung</option>
              <option value="INACTIVE">Inaktiv</option>
              <option value="TERMINATED">Ausgetreten</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
              Geschlecht
            </label>
            <select
              id="gender"
              name="gender"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="NOT_SPECIFIED">Keine Angabe</option>
              <option value="MALE">Männlich</option>
              <option value="FEMALE">Weiblich</option>
              <option value="DIVERSE">Divers</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
              Geburtsdatum
            </label>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Startdatum
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Adresse</p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <input
              name="street"
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Straße"
            />
            <input
              name="zip"
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="PLZ"
            />
            <input
              name="city"
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ort"
            />
            <input
              name="country"
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Land"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="taxId" className="block text-sm font-medium text-gray-700">
              Steuer-ID
            </label>
            <input
              id="taxId"
              name="taxId"
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Steuer-ID"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="socialSecurityNumber" className="block text-sm font-medium text-gray-700">
              Sozialversicherungsnummer
            </label>
            <input
              id="socialSecurityNumber"
              name="socialSecurityNumber"
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Sozialversicherungsnummer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="iban" className="block text-sm font-medium text-gray-700">
              IBAN
            </label>
            <input
              id="iban"
              name="iban"
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="IBAN"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="bic" className="block text-sm font-medium text-gray-700">
              BIC
            </label>
            <input
              id="bic"
              name="bic"
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="BIC"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="emergencyContactName" className="block text-sm font-medium text-gray-700">
              Notfallkontakt Name
            </label>
            <input
              id="emergencyContactName"
              name="emergencyContactName"
              type="text"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Notfallkontakt Name"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-gray-700">
              Notfallkontakt Telefon
            </label>
            <input
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              type="tel"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Notfallkontakt Telefon"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notizen
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Interne Notizen"
          />
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={createUser}
              onChange={(e) => setCreateUser(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-900">Benutzer-Account anlegen</span>
          </label>

          {createUser && (
            <div className="pl-7">
              <p className="mb-2 text-sm text-gray-600">Dem Benutzer wird ein temporäres Passwort zugewiesen. Beim ersten Login muss er ein neues Passwort mit mindestens 12 Zeichen setzen.</p>
              <div className="flex flex-wrap gap-3">
                {roles.map((role) => (
                  <label key={role.id} className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      value={role.id}
                      checked={userRoleIds.includes(role.id)}
                      onChange={(e) => {
                        if (e.target.checked) setUserRoleIds((ids) => [...ids, role.id]);
                        else setUserRoleIds((ids) => ids.filter((id) => id !== role.id));
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    {role.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <Link
            href="/dashboard/modules/employees"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </form>
    </div>
  );
}
