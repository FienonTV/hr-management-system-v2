"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: { id: string; name: string }[];
};

type Role = {
  id: string;
  name: string;
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) throw new Error("Fehler beim Laden");
        const data = await res.json();
        if (!cancelled) {
          setUsers(data.users || []);
          setRoles(data.roles || []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Fehler beim Laden");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function assignRole(userId: string, roleId: string) {
    try {
      const res = await fetch("/api/users/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleId }),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Fehler");
      }
      router.refresh();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    }
  }

  async function removeRole(userId: string, roleId: string) {
    try {
      const res = await fetch("/api/users/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleId }),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Fehler");
      }
      router.refresh();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
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
          <p className="mt-2 text-sm text-gray-600">Verwalten Sie die Rollenzuweisungen der Benutzer.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">E-Mail</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Aktuelle Rollen</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Rolle zuweisen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{user.email}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {user.firstName || user.lastName
                      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                      : "-"}
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
                            onClick={() => removeRole(user.id, role.id)}
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
                          assignRole(user.id, e.target.value);
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
