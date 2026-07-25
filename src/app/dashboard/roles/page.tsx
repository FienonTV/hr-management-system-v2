import { getRoles, deleteRole } from "@/lib/actions/roles";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield, Plus, Edit, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { revalidatePath } from "next/cache";
import type { Permission } from "@prisma/client";

function groupPermissionsByModule(permissions: Permission[]) {
  const map = new Map<string, Permission[]>();
  permissions.forEach((permission) => {
    const group = permission.module || "Sonstige";
    if (!map.has(group)) map.set(group, []);
    map.get(group)!.push(permission);
  });
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

export default async function RolesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let roles: Awaited<ReturnType<typeof getRoles>> = [];
  let error: string | null = null;

  try {
    roles = await getRoles();
  } catch (e) {
    error = e instanceof Error ? e.message : "Fehler beim Laden der Rollen";
  }

  async function handleDelete(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const result = await deleteRole(id);
    if (!result.success) {
      throw new Error(result.error || "Fehler beim Löschen");
    }
    revalidatePath("/dashboard/roles");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rollen & Berechtigungen</h1>
          <p className="mt-2 text-sm text-gray-600">Verwalten Sie Rollen und deren Berechtigungen.</p>
        </div>
        <Link
          href="/dashboard/roles/new"
          className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Neue Rolle</span>
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {roles.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <Shield className="h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Keine Rollen gefunden</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Beschreibung</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Berechtigungen</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Admin</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {roles.map((role) => {
                  const grouped = groupPermissionsByModule(role.permissions);
                  return (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{role.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={role.description || undefined}>
                        {role.description || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {role.isAdmin ? (
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                            Vollzugriff
                          </span>
                        ) : role.permissions.length === 0 ? (
                          <span className="text-gray-400">Keine Berechtigungen</span>
                        ) : (
                          <div className="space-y-2">
                            {grouped.map(([module, permissions]) => (
                              <div key={module}>
                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{module}</span>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {permissions.map((permission) => (
                                    <span
                                      key={permission.id}
                                      className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700"
                                      title={permission.key}
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                      {permission.description || `${permission.resource}:${permission.action}`}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {role.isAdmin ? (
                          <span className="inline-flex items-center text-purple-700">
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Ja
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-gray-500">
                            <XCircle className="mr-1 h-4 w-4" />
                            Nein
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/dashboard/roles/${role.id}`}
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                            title="Bearbeiten"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          {!role.isAdmin && (
                            <form action={handleDelete} className="inline">
                              <input type="hidden" name="id" value={role.id} />
                              <button
                                type="submit"
                                className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                                title="Löschen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
