import { getEmployees } from "@/lib/actions/employees";
import { auth } from "@/lib/auth";
import { Employee } from "@prisma/client";
import Link from "next/link";
import { Plus, Edit, User, Search } from "lucide-react";
import { redirect } from "next/navigation";

function initials(emp: Employee) {
  return `${emp.firstName?.charAt(0) ?? ""}${emp.lastName?.charAt(0) ?? ""}`.toUpperCase();
}

export default async function EmployeesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  try {
    const employees = (await getEmployees()) as Employee[];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mitarbeiter</h1>
            <p className="mt-2 text-sm text-gray-600">Verwalten Sie alle Mitarbeiter-Stammdaten</p>
          </div>
          <Link
            href="/dashboard/employees/new"
            className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Neuer Mitarbeiter</span>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Nach Name oder E-Mail suchen..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {employees.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center">
              <User className="h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Keine Mitarbeiter gefunden</h3>
              <p className="mt-2 text-sm text-gray-500">Erstellen Sie Ihren ersten Mitarbeiter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">E-Mail</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Abteilung</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Startdatum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Benutzer-Account</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {employees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                            <span className="text-sm font-medium text-primary-600">{initials(employee)}</span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {employee.firstName} {employee.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{employee.email || '-'}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{employee.position || '-'}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{employee.department || '-'}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {employee.startDate
                          ? new Date(employee.startDate).toLocaleDateString("de-DE")
                          : '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {('userAccount' in employee && employee.userAccount) ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Aktiv
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                            Kein Account
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/dashboard/employees/${employee.id}`}
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                            title="Bearbeiten"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
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
  } catch (e) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Fehler beim Laden der Mitarbeiter: {e instanceof Error ? e.message : "Unbekannter Fehler"}
      </div>
    );
  }
}
