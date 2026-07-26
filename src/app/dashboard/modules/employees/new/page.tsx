"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createEmployee } from "@/lib/actions/employees";
import { getRoles } from "@/lib/actions/roles";
import type { CreateEmployeeInput } from "@/lib/schemas/employees";
import { CheckCircle2, X, AlertCircle } from "lucide-react";

type Role = { id: string; name: string };

type Toast = {
  id: string;
  message: string;
  variant: "success" | "error";
};

export default function NewEmployeePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [createUser, setCreateUser] = useState(false);
  const [userRoleIds, setUserRoleIds] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    getRoles().then(setRoles).catch(console.error);
  }, []);

  function addToast(message: string, variant: "success" | "error") {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const form = event.currentTarget;
    const formData = new FormData(form);
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    const errors: Record<string, string> = {};
    if (!firstName) errors.firstName = "Vorname ist ein Pflichtfeld.";
    if (!lastName) errors.lastName = "Nachname ist ein Pflichtfeld.";
    if (createUser && !email) errors.email = "E-Mail ist Pflicht, wenn ein Benutzer-Account angelegt wird.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    const data = {
      employeeNumber: String(formData.get("employeeNumber") ?? "").trim() || undefined,
      firstName,
      lastName,
      email: email || undefined,
      phone: String(formData.get("phone") ?? "").trim() || undefined,
      position: String(formData.get("position") ?? "").trim() || undefined,
      department: String(formData.get("department") ?? "").trim() || undefined,
      employmentType: (String(formData.get("employmentType") ?? "").trim() || undefined) as CreateEmployeeInput["employmentType"],
      status: (String(formData.get("status") ?? "").trim() || undefined) as CreateEmployeeInput["status"],
      birthDate: String(formData.get("birthDate") ?? "").trim() || undefined,
      gender: (String(formData.get("gender") ?? "").trim() || undefined) as CreateEmployeeInput["gender"],
      startDate: String(formData.get("startDate") ?? "").trim() || undefined,
      street: String(formData.get("street") ?? "").trim() || undefined,
      zip: String(formData.get("zip") ?? "").trim() || undefined,
      city: String(formData.get("city") ?? "").trim() || undefined,
      country: String(formData.get("country") ?? "").trim() || undefined,
      taxId: String(formData.get("taxId") ?? "").trim() || undefined,
      socialSecurityNumber: String(formData.get("socialSecurityNumber") ?? "").trim() || undefined,
      iban: String(formData.get("iban") ?? "").trim() || undefined,
      bic: String(formData.get("bic") ?? "").trim() || undefined,
      emergencyContactName: String(formData.get("emergencyContactName") ?? "").trim() || undefined,
      emergencyContactPhone: String(formData.get("emergencyContactPhone") ?? "").trim() || undefined,
      notes: String(formData.get("notes") ?? "").trim() || undefined,
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

      const message = result.temporaryPassword
        ? `Mitarbeiter angelegt. Temporäres Passwort: ${result.temporaryPassword}`
        : "Mitarbeiter erfolgreich angelegt.";
      addToast(message, "success");
      form.reset();
      setCreateUser(false);
      setUserRoleIds([]);

      setTimeout(() => {
        if (result.employeeId) {
          router.push(`/dashboard/modules/employees/${result.employeeId}`);
        }
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Fehler beim Speichern";
      setError(msg);
      addToast(msg, "error");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg border ${
              toast.variant === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {toast.variant === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            )}
            <p className="text-sm">{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="shrink-0 rounded p-1 hover:bg-black/5"
              aria-label="Schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

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

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              Vorname <span className="text-red-500">*</span>
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              className={`w-full rounded-lg border px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                fieldErrors.firstName ? "border-red-500 ring-1 ring-red-500" : "border-gray-300"
              }`}
              placeholder="Vorname"
            />
            {fieldErrors.firstName && (
              <p className="text-sm text-red-600">{fieldErrors.firstName}</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Nachname <span className="text-red-500">*</span>
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              className={`w-full rounded-lg border px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                fieldErrors.lastName ? "border-red-500 ring-1 ring-red-500" : "border-gray-300"
              }`}
              placeholder="Nachname"
            />
            {fieldErrors.lastName && (
              <p className="text-sm text-red-600">{fieldErrors.lastName}</p>
            )}
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
            E-Mail {createUser && <span className="text-red-500">*</span>}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required={createUser}
            className={`w-full rounded-lg border px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              fieldErrors.email ? "border-red-500 ring-1 ring-red-500" : "border-gray-300"
            }`}
            placeholder="E-Mail"
          />
          {fieldErrors.email && (
            <p className="text-sm text-red-600">{fieldErrors.email}</p>
          )}
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
