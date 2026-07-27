"use client";

import { useEffect, useState, useCallback, useTransition, useRef } from "react";
import Link from "next/link";
import { Plus, User as UserIcon, Search, X } from "lucide-react";
import { getEmployees } from "@/lib/actions/employees";
import EmployeeRow from "./EmployeeRow";
import type { Employee, User } from "@prisma/client";

type EmployeeWithUser = Employee & { userAccount?: User | null };

interface EmployeesClientProps {
  initialEmployees: EmployeeWithUser[];
  initialQuery?: string;
}

export default function EmployeesClient({ initialEmployees, initialQuery = "" }: EmployeesClientProps) {
  const [query, setQuery] = useState(initialQuery);
  const [employees, setEmployees] = useState<EmployeeWithUser[]>(initialEmployees);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getEmployees(searchTerm);
      setEmployees(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suche fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      startTransition(() => {
        search(query);
      });
    }, 300);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, search]);

  return (
    <div className="space-y-6">
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

      <div className="flex flex-col space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nach Name, E-Mail, Nummer, Position oder Abteilung suchen..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-10 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="Suche leeren"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {(loading || isPending) && <span className="text-sm text-gray-500">Suche...</span>}
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {employees.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <UserIcon className="h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Keine Mitarbeiter gefunden</h3>
            <p className="mt-2 text-sm text-gray-500">{query ? "Keine Treffer für die Suche." : "Erstellen Sie Ihren ersten Mitarbeiter."}</p>
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
}
