import { getEmployees } from "@/lib/actions/employees";
import { auth } from "@/lib/auth";
import { Employee } from "@prisma/client";
import Link from "next/link";
import { Plus, User, Search } from "lucide-react";
import { redirect } from "next/navigation";
import EmployeeRow from "./EmployeeRow";

export default async function EmployeesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  try {
    const employees = (await getEmployees()) as (Employee & { userAccount?: { id: string } | null })[];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mitarbeiter</h1>
            <p className="mt-2 text-sm text-gray-600">Verwalten Sie alle Mitarbeiter-Stammdaten</p>
          </div>
          <Link
            href="/dashboard/modules/employees/new"
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
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Startdatum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Benutzer-Account</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {employees.map((employee) => (
                    <EmployeeRow key={employee.id} employee={employee} />
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
