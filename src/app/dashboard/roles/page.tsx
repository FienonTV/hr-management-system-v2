import { getRoles } from "@/lib/actions/roles";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield, Plus, Edit, Trash2 } from "lucide-react";

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
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Admin</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{role.name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{role.isAdmin ? "Ja" : "Nein"}</td>
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
                          <form
                            action={async () => {
                              'use server';
                              const { deleteRole } = await import('@/lib/actions/roles');
                              await deleteRole(role.id);
                            }}
                            className="inline"
                          >
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
