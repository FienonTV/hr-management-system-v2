"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, FileText, ArrowLeft, Plus, Trash2, Save, X, Lock, Copy, Check } from "lucide-react";
import { getEmployeeById, updateEmployee, deleteEmployee } from "@/lib/actions/employees";
import {
  getEmployeeUser,
  createEmployeeUser,
  updateEmployeeUser,
  deleteEmployeeUser,
  resetEmployeeUserPassword,
  getAssignableRoles,
} from "@/lib/actions/employeeUsers";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  position: string | null;
  department: string | null;
  startDate: string | null;
  userAccount?: { id: string } | null;
};

type RoleOption = { id: string; name: string; isAdmin: boolean };

type Tab = "stammdaten" | "user";

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("stammdaten");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { id } = await params;
        const data = await getEmployeeById(id);
        if (!cancelled) {
          if (data) {
            setEmployee({
              ...data,
              startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
            });
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
      const result = await updateEmployee(id, data);
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
      const { id } = await params;
      const result = await deleteEmployee(id);
      if (!result.success) {
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
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-gray-600">Laden...</p>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error || "Mitarbeiter nicht gefunden"}</div>
      </div>
    );
  }

  const tabs = [
    { id: "stammdaten" as Tab, label: "Stammdaten", icon: FileText },
    { id: "user" as Tab, label: "Benutzer-Account", icon: ShieldCheck },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="mt-2 text-sm text-gray-600">Mitarbeiter bearbeiten</p>
        </div>
        <Link
          href="/dashboard/employees"
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
            {employee.userAccount && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                Der Mitarbeiter kann nicht gelöscht werden, weil ein Benutzer-Account verknüpft ist. Widerrufen Sie zuerst den Portalzugriff im Tab &quot;Benutzer-Account&quot;.
              </p>
            )}
            <button
              type="button"
              onClick={handleDelete}
              disabled={!!employee.userAccount}
              className="flex items-center space-x-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>Löschen</span>
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Speichern..." : "Speichern"}</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === "user" && (
        <EmployeeUserTab employeeId={employee.id} initialEmail={employee.email} />
      )}
    </div>
  );
}

function EmployeeUserTab({ employeeId, initialEmail }: { employeeId: string; initialEmail: string | null }) {
  const router = useRouter();
  const [user, setUser] = useState<
    | {
        id: string;
        email: string;
        isActive: boolean;
        roles: { id: string; name: string }[];
      }
    | null
    | undefined
  >(undefined);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [createForm, setCreateForm] = useState({
    email: initialEmail || "",
    roleIds: [] as string[],
  });
  const [editForm, setEditForm] = useState({
    isActive: true,
    roleIds: [] as string[],
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [userResult, roleList] = await Promise.all([
          getEmployeeUser(employeeId),
          getAssignableRoles(),
        ]);
        if (cancelled) return;

        if (!userResult.success) {
          setError(userResult.error || "Fehler beim Laden");
        } else {
          setUser(userResult.user);
          if (userResult.user) {
            setEditForm({
              isActive: userResult.user.isActive,
              roleIds: userResult.user.roles.map((r) => r.id),
            });
          }
        }
        setRoles(roleList);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Fehler beim Laden");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [employeeId]);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    setTempPassword(null);

    try {
      const result = await createEmployeeUser({
        employeeId,
        email: createForm.email,
        roleIds: createForm.roleIds,
      });

      if (!result.success) {
        throw new Error(result.error || "Fehler beim Anlegen");
      }

      setTempPassword(result.tempPassword || null);
      setShowCreate(false);
      setCreateForm({ email: initialEmail || "", roleIds: [] });
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Anlegen");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    setSaving(true);
    setError(null);

    try {
      const result = await updateEmployeeUser({
        employeeId,
        isActive: editForm.isActive,
        roleIds: editForm.roleIds,
      });

      if (!result.success) {
        throw new Error(result.error || "Fehler beim Speichern");
      }

      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!confirm("Passwort wirklich zurücksetzen?")) return;
    setSaving(true);
    setError(null);
    setTempPassword(null);

    try {
      const result = await resetEmployeeUserPassword(employeeId);
      if (!result.success) {
        throw new Error(result.error || "Fehler beim Zurücksetzen");
      }
      setTempPassword(result.tempPassword || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Zurücksetzen");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Benutzer-Account wirklich widerrufen?")) return;
    setSaving(true);
    setError(null);

    try {
      const result = await deleteEmployeeUser(employeeId);
      if (!result.success) {
        throw new Error(result.error || "Fehler beim Widerrufen");
      }
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Widerrufen");
    } finally {
      setSaving(false);
    }
  }

  async function refreshUser() {
    const result = await getEmployeeUser(employeeId);
    if (result.success) {
      setUser(result.user);
      if (result.user) {
        setEditForm({
          isActive: result.user.isActive,
          roleIds: result.user.roles.map((r) => r.id),
        });
      }
    }
    router.refresh();
  }

  function toggleRole(roleId: string, form: "create" | "edit") {
    const updater = (prev: string[]) => {
      const set = new Set(prev);
      if (set.has(roleId)) set.delete(roleId);
      else set.add(roleId);
      return Array.from(set);
    };
    if (form === "create") {
      setCreateForm((prev) => ({ ...prev, roleIds: updater(prev.roleIds) }));
    } else {
      setEditForm((prev) => ({ ...prev, roleIds: updater(prev.roleIds) }));
    }
  }

  function copyPassword(password: string) {
    void navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-gray-600">Laden...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6">
      {tempPassword && (
        <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800 space-y-2">
          <p className="font-medium">Temporäres Passwort:</p>
          <div className="flex items-center space-x-2">
            <code className="rounded bg-yellow-100 px-2 py-1 font-mono">{tempPassword}</code>
            <button
              type="button"
              onClick={() => copyPassword(tempPassword)}
              className="rounded p-1 hover:bg-yellow-200"
              title="Kopieren"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs">Bitte notieren und dem Benutzer sicher übermitteln.</p>
        </div>
      )}

      {!user && !showCreate && (
        <div className="text-center space-y-4 py-8">
          <ShieldCheck className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">Kein Benutzer-Account</h3>
          <p className="text-sm text-gray-600">Diesem Mitarbeiter ist noch kein Portal-Account zugeordnet.</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Account anlegen</span>
          </button>
        </div>
      )}

      {!user && showCreate && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Benutzer-Account anlegen</h3>

          <div className="space-y-2">
            <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700">E-Mail</label>
            <input
              id="userEmail"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-gray-700">Rollen</span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-start space-x-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={createForm.roleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id, "create")}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="block text-sm font-medium text-gray-900">{role.name}</span>
                    {role.isAdmin && <span className="text-xs text-primary-600">Admin</span>}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setCreateForm({ email: initialEmail || "", roleIds: [] });
              }}
              className="flex items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4" />
              <span>Abbrechen</span>
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !createForm.email.trim()}
              className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{saving ? "Anlegen..." : "Anlegen"}</span>
            </button>
          </div>
        </div>
      )}

      {user && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Benutzer-Account</h3>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                user.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {user.isActive ? "Aktiv" : "Inaktiv"}
            </span>
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-gray-700">Rollen</span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-start space-x-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={editForm.roleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id, "edit")}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="block text-sm font-medium text-gray-900">{role.name}</span>
                    {role.isAdmin && <span className="text-xs text-primary-600">Admin</span>}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) => setEditForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>Account aktiv</span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center space-x-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>Widerrufen</span>
            </button>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={saving}
                className="flex items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                <span>Passwort zurücksetzen</span>
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                disabled={saving}
                className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? "Speichern..." : "Speichern"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
