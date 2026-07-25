"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser, deleteUser } from "@/lib/actions/users";
import { assignRoleToUser, removeRoleFromUser, getRoles } from "@/lib/actions/roles";
import { getEmployeesWithoutUser } from "@/lib/actions/employees";

type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isSystemAdmin: boolean;
  employee?: { id: string; firstName: string; lastName: string } | null;
  roles: { id: string; name: string }[];
};

type Role = {
  id: string;
  name: string;
};

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [newRoleIds, setNewRoleIds] = useState<string[]>([]);

  async function load() {
    try {
      const [usersRes, rolesData, employeesData] = await Promise.all([
        fetch("/api/users").then((r) => r.json()),
        getRoles(),
        getEmployeesWithoutUser(),
      ]);
      setUsers(usersRes.users || []);
      setRoles(rolesData);
      setEmployees(employeesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAssignRole(userId: string, roleId: string) {
    const result = await assignRoleToUser(userId, roleId);
    if (result.success) {
      router.refresh();
      load();
    } else {
      setError(result.error || "Fehler");
    }
  }

  async function handleRemoveRole(userId: string, roleId: string) {
    const result = await removeRoleFromUser(userId, roleId);
    if (result.success) {
      router.refresh();
      load();
    } else {
      setError(result.error || "Fehler");
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createUser({
        email: newEmail,
        employeeId: newEmployeeId,
        roleIds: newRoleIds,
      });
      if (result.success) {
        setShowForm(false);
        setNewEmail("");
        setNewEmployeeId("");
        setNewRoleIds([]);
        load();
      } else {
        setError(result.error || "Fehler beim Erstellen");
      }
    });
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Benutzer wirklich löschen?")) return;
    const result = await deleteUser(userId);
    if (result.success) {
      load();
    } else {
      setError(result.error || "Fehler");
    }
  }

  if (loading) {
    return <p className="text-gray-600">Laden...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Benutzer &amp; Rollen</h1>
          <p className="mt-2 text-sm text-gray-600">Verwalten Sie die Benutzer-Accounts und Rollenzuweisungen.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          {showForm ? "Abbrechen" : "Benutzer erstellen"}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleCreateUser} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Neuen Benutzer anlegen</h2>
          <p className="text-sm text-gray-600">Jeder Benutzer muss einem bestehenden Mitarbeiter zugeordnet werden.</p>

          <div>
            <label className="block text-sm font-medium text-gray-700">Mitarbeiter</label>
            <select
              required
              value={newEmployeeId}
              onChange={(e) => {
                setNewEmployeeId(e.target.value);
                const emp = employees.find((x) => x.id === e.target.value);
                if (emp?.email) setNewEmail(emp.email);
              }}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Mitarbeiter auswählen...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} {emp.email ? `(${emp.email})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">E-Mail (Login)</label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Rollen</label>
            <div className="mt-2 flex flex-wrap gap-3">
              {roles.map((role) => (
                <label key={role.id} className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    value={role.id}
                    checked={newRoleIds.includes(role.id)}
                    onChange={(e) => {
                      if (e.target.checked) setNewRoleIds((ids) => [...ids, role.id]);
                      else setNewRoleIds((ids) => ids.filter((id) => id !== role.id));
                    }}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  {role.name}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? "Wird erstellt..." : "Erstellen"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">E-Mail</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Mitarbeiter</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Aktuelle Rollen</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Rolle zuweisen</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{user.email}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {user.isSystemAdmin ? (
                      <span className="text-xs text-gray-500">System-Admin</span>
                    ) : user.employee ? (
                      `${user.employee.firstName} ${user.employee.lastName}`
                    ) : (
                      <span className="text-red-600">Kein Mitarbeiter!</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex flex-wrap gap-2">
                      {user.roles.length === 0 && (
                        <span className="text-gray-500">Keine Rollen</span>
                      )}
                      {user.roles.map((role) => (
                        <span
                          key={role.id}
                          className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800"
                        >
                          {role.name}
                          <button
                            onClick={() => handleRemoveRole(user.id, role.id)}
                            className="ml-1.5 text-primary-600 hover:text-primary-800"
                            title="Rolle entfernen"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <select
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignRole(user.id, e.target.value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="" disabled>Rolle auswählen...</option>
                      {roles
                        .filter((role) => !user.roles.find((r) => r.id === role.id))
                        .map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {!user.isSystemAdmin && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Löschen
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
