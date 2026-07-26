"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  FileText,
  ArrowLeft,
  Save,
  Trash2,
  Lock,
  Copy,
  Check,
  Plus,
  Calendar,
  Briefcase,
  User,
  X,
  Mail,
  RefreshCw,
  Upload,
  Download,
} from "lucide-react";
import {
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  getEmploymentContracts,
  createEmploymentContract,
  updateEmploymentContract,
  deleteEmploymentContract,
} from "@/lib/actions/employees";
import {
  getEmployeeUser,
  createEmployeeUser,
  updateEmployeeUser,
  deleteEmployeeUser,
  resetEmployeeUserPassword,
  getAssignableRoles,
} from "@/lib/actions/employeeUsers";
import { createInvitation } from "@/lib/actions/invitations";
import { listFiles, deleteFile } from "@/lib/actions/files";
import type { Employee, EmploymentContract, RoleOption, EmployeeUserData, FileItem } from "./types";
import type { EmploymentContractInput } from "@/lib/schemas/employees";

type Tab = "stammdaten" | "vertraege" | "dokumente" | "user";

function toDateInputValue(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [contracts, setContracts] = useState<EmploymentContract[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("stammdaten");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { id } = await params;
        const [empData, contractData] = await Promise.all([
          getEmployeeById(id),
          getEmploymentContracts(id),
        ]);
        if (!cancelled) {
          if (empData) {
            setEmployee(empData);
            setContracts(contractData);
            const fileResult = await listFiles({ employeeId: id, limit: 100 });
            setFiles(fileResult.files);
          } else {
            setError("Mitarbeiter nicht gefunden");
          }
        }
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
    if (!employee) return;
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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <p className="text-gray-600">Laden...</p>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error || "Mitarbeiter nicht gefunden"}</div>
      </div>
    );
  }

  const tabs = [
    { id: "stammdaten" as Tab, label: "Stammdaten", icon: FileText },
    { id: "vertraege" as Tab, label: "Verträge", icon: Briefcase },
    { id: "dokumente" as Tab, label: "Dokumente", icon: FileText },
    { id: "user" as Tab, label: "Benutzer-Account", icon: ShieldCheck },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="mt-2 text-sm text-gray-600">Mitarbeiter bearbeiten</p>
        </div>
        <Link
          href="/dashboard/modules/employees"
          className="flex items-center space-x-1 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Zurück</span>
        </Link>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "stammdaten" && (
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
      )}

      {activeTab === "vertraege" && (
        <ContractsTab employeeId={employee.id} contracts={contracts} onChange={setContracts} />
      )}

      {activeTab === "dokumente" && (
        <DocumentsTab employeeId={employee.id} files={files} onFilesChange={setFiles} />
      )}

      {activeTab === "user" && (
        <UserTab employeeId={employee.id} email={employee.email} />
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );
}

function ContractsTab({
  employeeId,
  contracts,
  onChange,
}: {
  employeeId: string;
  contracts: EmploymentContract[];
  onChange: (contracts: EmploymentContract[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const data: EmploymentContractInput = {
      title: String(formData.get("title")),
      contractType: String(formData.get("contractType")) as EmploymentContractInput["contractType"],
      startDate: new Date(String(formData.get("startDate"))),
      endDate: formData.get("endDate") ? new Date(String(formData.get("endDate"))) : undefined,
      weeklyHours: formData.get("weeklyHours") ? Number(formData.get("weeklyHours")) : undefined,
      salaryJson: String(formData.get("salaryJson") || "{}"),
      notes: String(formData.get("notes") || ""),
    };

    try {
      if (editingId) {
        const result = await updateEmploymentContract(editingId, data);
        if (!result.success) throw new Error(result.error || "Fehler beim Speichern");
      } else {
        const result = await createEmploymentContract(employeeId, data);
        if (!result.success) throw new Error(result.error || "Fehler beim Erstellen");
      }
      const updated = await getEmploymentContracts(employeeId);
      onChange(updated);
      setEditingId(null);
      (event.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Vertrag wirklich löschen?")) return;
    const result = await deleteEmploymentContract(id);
    if (!result.success) {
      setError(result.error || "Fehler beim Löschen");
      return;
    }
    const updated = await getEmploymentContracts(employeeId);
    onChange(updated);
  }

  const editingContract = editingId ? contracts.find((c) => c.id === editingId) : null;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          {editingId ? "Vertrag bearbeiten" : "Neuer Vertrag"}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Bezeichnung" name="title" defaultValue={editingContract?.title ?? ""} required />
          <div className="space-y-2">
            <label htmlFor="contractType" className="block text-sm font-medium text-gray-700">Vertragsart</label>
            <select
              id="contractType"
              name="contractType"
              defaultValue={editingContract?.contractType ?? "PERMANENT"}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
            >
              <option value="PERMANENT">Unbefristet</option>
              <option value="FIXED_TERM">Befristet</option>
              <option value="MINIJOB">Minijob</option>
              <option value="WORKER">Werkvertrag</option>
            </select>
          </div>
          <Field label="Beginn" name="startDate" type="date" defaultValue={toDateInputValue(editingContract?.startDate)} required />
          <Field label="Ende" name="endDate" type="date" defaultValue={toDateInputValue(editingContract?.endDate)} />
          <Field label="Wochenstunden" name="weeklyHours" type="number" defaultValue={editingContract?.weeklyHours?.toString() ?? ""} />
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 space-y-2">
            <label htmlFor="salaryJson" className="block text-sm font-medium text-gray-700">Gehaltsinformationen (JSON)</label>
            <textarea
              id="salaryJson"
              name="salaryJson"
              rows={3}
              defaultValue={editingContract?.salaryJson ?? "{}"}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 font-mono text-sm"
            />
          </div>
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 space-y-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notizen</label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={editingContract?.notes ?? ""}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Speichern..." : editingId ? "Aktualisieren" : "Hinzufügen"}</span>
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bezeichnung</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Art</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zeitraum</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wochenstunden</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {contracts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                  Keine Verträge vorhanden
                </td>
              </tr>
            ) : (
              contracts.map((contract) => (
                <tr key={contract.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{contract.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{contract.contractType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(contract.startDate).toLocaleDateString("de-DE")}
                    {contract.endDate && ` – ${new Date(contract.endDate).toLocaleDateString("de-DE")}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{contract.weeklyHours ?? "–"}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    <button
                      onClick={() => setEditingId(contract.id)}
                      className="text-primary-600 hover:text-primary-700 mr-3"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDelete(contract.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserTab({ employeeId, email }: { employeeId: string; email: string | null }) {
  const [userData, setUserData] = useState<EmployeeUserData | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [userResult, roleList] = await Promise.all([getEmployeeUser(employeeId), getAssignableRoles()]);
        if (!cancelled) {
          if (userResult.success && userResult.user) {
            setUserData(userResult.user);
          }
          setRoles(roleList);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [employeeId]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const result = await createEmployeeUser({
      employeeId,
      email: String(formData.get("email")),
      roleIds: Array.from(formData.getAll("roleIds") as Iterable<string>),
    });
    if (!result.success) {
      setError(result.error || "Fehler");
      return;
    }
    setTempPassword(result.tempPassword || null);
    const refreshed = await getEmployeeUser(employeeId);
    if (refreshed.success && refreshed.user) setUserData(refreshed.user);
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const result = await updateEmployeeUser({
      employeeId,
      roleIds: Array.from(formData.getAll("roleIds") as Iterable<string>),
      isActive: formData.get("isActive") === "on",
    });
    if (!result.success) {
      setError(result.error || "Fehler");
      return;
    }
    const refreshed = await getEmployeeUser(employeeId);
    if (refreshed.success && refreshed.user) setUserData(refreshed.user);
  }

  async function handleReset() {
    setError(null);
    const result = await resetEmployeeUserPassword(employeeId);
    if (!result.success) {
      setError(result.error || "Fehler");
      return;
    }
    setTempPassword(result.tempPassword || null);
  }

  async function handleDelete() {
    if (!confirm("Benutzer-Account wirklich entfernen?")) return;
    const result = await deleteEmployeeUser(employeeId);
    if (!result.success) {
      setError(result.error || "Fehler");
      return;
    }
    setUserData(null);
  }

  async function handleInvite() {
    setError(null);
    if (!email) {
      setError("Mitarbeiter hat keine E-Mail-Adresse");
      return;
    }
    const result = await createInvitation({ email, roleIds: [], employeeId });
    if (!result.success) {
      setError(result.error || "Fehler");
      return;
    }
    setInvitationToken(result.token || null);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <p className="text-gray-600">Laden...</p>;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {tempPassword && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
          <p className="font-medium">Temporäres Passwort:</p>
          <div className="mt-2 flex items-center space-x-2">
            <code className="rounded bg-white px-2 py-1 font-mono">{tempPassword}</code>
            <button onClick={() => copy(tempPassword)} className="text-green-700 hover:text-green-900">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {invitationToken && (
        <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-medium">Einladungs-Link erstellt:</p>
          <div className="mt-2 flex items-center space-x-2">
            <code className="rounded bg-white px-2 py-1 font-mono break-all">{`${typeof window !== "undefined" ? window.location.origin : ""}/invitation/${invitationToken}`}</code>
            <button onClick={() => copy(invitationToken)} className="text-blue-700 hover:text-blue-900">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {userData ? (
        <form onSubmit={handleUpdate} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-primary-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">{userData.email}</h3>
              <p className="text-sm text-gray-600">{userData.isActive ? "Aktiv" : "Inaktiv"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <input type="checkbox" name="isActive" defaultChecked={userData.isActive} className="rounded border-gray-300" />
              <span>Account aktiv</span>
            </label>
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-gray-700">Rollen</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center space-x-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="roleIds"
                    value={role.id}
                    defaultChecked={userData.roles.some((r) => r.id === role.id)}
                    className="rounded border-gray-300"
                  />
                  <span>{role.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="submit"
              className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Save className="h-4 w-4" />
              <span>Speichern</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Lock className="h-4 w-4" />
              <span>Passwort zurücksetzen</span>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center space-x-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>Account entfernen</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Benutzer-Account erstellen</h3>
            <Field label="E-Mail" name="email" type="email" defaultValue={email ?? ""} required />
            <div className="space-y-2">
              <span className="block text-sm font-medium text-gray-700">Rollen</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center space-x-2 text-sm text-gray-700">
                    <input type="checkbox" name="roleIds" value={role.id} className="rounded border-gray-300" />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              <span>Account erstellen</span>
            </button>
          </form>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Oder Einladung senden</h3>
            <p className="text-sm text-gray-600">
              Der Mitarbeiter erhält einen Link und legt selbst ein Passwort fest.
            </p>
            <button
              onClick={handleInvite}
              className="flex items-center space-x-2 rounded-lg border border-primary-300 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
            >
              <Mail className="h-4 w-4" />
              <span>Einladung erstellen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentsTab({
  employeeId,
  files,
  onFilesChange,
}: {
  employeeId: string;
  files: FileItem[];
  onFilesChange: (files: FileItem[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.append("employeeId", employeeId);
    formData.append("parentType", "employee");
    formData.append("parentId", employeeId);

    try {
      const response = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Upload fehlgeschlagen");
        return;
      }

      form.reset();
      const updatedFiles = await listFiles({ employeeId, limit: 100 });
      onFilesChange(updatedFiles.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteFile(fileId: string) {
    if (!confirm("Dokument wirklich in den Papierkorb verschieben?")) return;
    const result = await deleteFile(fileId);
    if (!result.success) {
      setError(result.error || "Löschen fehlgeschlagen");
      return;
    }
    const updatedFiles = await listFiles({ employeeId, limit: 100 });
    onFilesChange(updatedFiles.files);
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  function categoryLabel(category: FileItem["category"]) {
    const labels: Record<string, string> = {
      CONTRACT: "Vertrag",
      PAYSLIP: "Lohnabrechnung",
      DOCUMENT: "Dokument",
      CERTIFICATE: "Bescheinigung",
      AVATAR: "Avatar",
      OTHER: "Sonstiges",
    };
    return labels[category] || category;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleUpload} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Dokument hochladen</h3>
        {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="file" className="block text-sm font-medium text-gray-700">
              Datei
            </label>
            <input
              id="file"
              name="file"
              type="file"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Kategorie
            </label>
            <select
              id="category"
              name="category"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="OTHER">Sonstiges</option>
              <option value="CONTRACT">Vertrag</option>
              <option value="PAYSLIP">Lohnabrechnung</option>
              <option value="DOCUMENT">Dokument</option>
              <option value="CERTIFICATE">Bescheinigung</option>
              <option value="AVATAR">Avatar</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Dokumententitel
            </label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="z. B. Arbeitsvertrag 2026"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700">
              Ablaufdatum (optional)
            </label>
            <input
              id="expiresAt"
              name="expiresAt"
              type="date"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          <span>{uploading ? "Wird hochgeladen..." : "Hochladen"}</span>
        </button>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900">Dokumente</h3>
        {files.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Noch keine Dokumente vorhanden.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-200">
            {files
              .filter((f) => !f.isDeleted)
              .map((file) => (
                <li key={file.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{file.title || file.originalName}</p>
                    <p className="text-xs text-gray-500">
                      {categoryLabel(file.category)} · {formatBytes(file.sizeBytes)} · Version {file.version}
                      {file.expiresAt && (
                        <span className="ml-2">· gültig bis {new Date(file.expiresAt).toLocaleDateString("de-DE")}</span>
                      )}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    <a
                      href={`/api/files/${file.id}`}
                      download
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                      title="Herunterladen"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(file.id)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                      title="In Papierkorb verschieben"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
