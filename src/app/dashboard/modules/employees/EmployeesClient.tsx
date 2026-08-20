"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Plus, User as UserIcon, Search, X, ChevronDown, ChevronUp, SlidersHorizontal, RotateCcw, Download } from "lucide-react";
import EmployeeRow from "./EmployeeRow";
import type { Employee, User } from "@prisma/client";
import { exportEmployeesToCSV } from "@/lib/actions/employees";

export type EmployeeWithRelations = Employee & {
  userAccount?: User | null;
  position?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
};

type SortKey = "name" | "email" | "position" | "department" | "status" | "startDate";
type SortDirection = "asc" | "desc";
interface SortState {
  key: SortKey;
  direction: SortDirection;
}

interface EmployeesClientProps {
  initialEmployees: EmployeeWithRelations[];
  permissions: string[];
}

const statusLabels: Record<string, string> = {
  ACTIVE: "Aktiv",
  INACTIVE: "Inaktiv",
  ONBOARDING: "Einstellung",
  TERMINATED: "Ausgetreten",
};

interface HeaderDef {
  key: SortKey | "userAccount";
  label: string;
  sortable?: boolean;
}

const tableHeaders: HeaderDef[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "email", label: "E-Mail", sortable: true },
  { key: "position", label: "Position", sortable: true },
  { key: "department", label: "Abteilung", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "startDate", label: "Startdatum", sortable: true },
  { key: "userAccount", label: "Benutzer-Account", sortable: false },
];

function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesSearch(employee: EmployeeWithRelations, query: string): boolean {
  if (!query.trim()) return true;
  const q = normalizeSearch(query);
  const haystack = [
    employee.firstName,
    employee.lastName,
    employee.email,
    employee.employeeNumber,
    employee.position?.name,
    employee.department?.name,
    employee.status,
    employee.userAccount?.email,
    employee.userAccount?.firstName,
    employee.userAccount?.lastName,
  ]
    .filter(Boolean)
    .join(" ");
  return normalizeSearch(haystack).includes(q);
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

function compareString(a: string | null | undefined, b: string | null | undefined): number {
  const aStr = a ?? "";
  const bStr = b ?? "";
  return aStr.localeCompare(bStr, "de", { sensitivity: "base" });
}

function compareDate(a: Date | null | undefined, b: Date | null | undefined): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.getTime() - b.getTime();
}

function sortEmployees(employees: EmployeeWithRelations[], sort: SortState): EmployeeWithRelations[] {
  const { key, direction } = sort;
  const sorted = [...employees].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "name":
        cmp = compareString(`${a.lastName} ${a.firstName}`, `${b.lastName} ${b.firstName}`);
        break;
      case "email":
        cmp = compareString(a.email, b.email);
        break;
      case "position":
        cmp = compareString(a.position?.name, b.position?.name);
        break;
      case "department":
        cmp = compareString(a.department?.name, b.department?.name);
        break;
      case "status":
        cmp = compareString(a.status, b.status);
        break;
      case "startDate":
        cmp = compareDate(a.startDate, b.startDate);
        break;
    }
    return direction === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export default function EmployeesClient({ initialEmployees, permissions }: EmployeesClientProps) {
  const canCreate = permissions.includes("employees:create");
  const canExport = permissions.includes("employees:export");

  const [query, setQuery] = useState("");
  const [allEmployees] = useState(initialEmployees);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [startDateFrom, setStartDateFrom] = useState<string>("");
  const [startDateTo, setStartDateTo] = useState<string>("");
  const [sort, setSort] = useState<SortState>({ key: "name", direction: "asc" });

  const departments = useMemo(
    () =>
      Array.from(
        new Map(
          allEmployees
            .filter((e) => e.department)
            .map((e) => [e.department!.id, e.department!])
        ).values()
      ).sort((a, b) => a.name.localeCompare(b.name, "de")),
    [allEmployees]
  );

  const filteredEmployees = useMemo(() => {
    let result = allEmployees;

    // Search
    if (query.trim()) {
      result = result.filter((e) => matchesSearch(e, query));
    }

    // Status filter
    if (selectedStatuses.length > 0) {
      result = result.filter((e) => selectedStatuses.includes(e.status));
    }

    // Department filter
    if (selectedDepartment) {
      result = result.filter((e) => e.department?.id === selectedDepartment);
    }

    // Date range filter
    const from = parseDate(startDateFrom);
    const to = parseDate(startDateTo);
    if (from || to) {
      result = result.filter((e) => {
        if (!e.startDate) return false;
        const start = new Date(e.startDate);
        if (from && start < from) return false;
        if (to) {
          const toEndOfDay = new Date(to);
          toEndOfDay.setHours(23, 59, 59, 999);
          if (start > toEndOfDay) return false;
        }
        return true;
      });
    }

    return sortEmployees(result, sort);
  }, [allEmployees, query, selectedStatuses, selectedDepartment, startDateFrom, startDateTo, sort]);

  const toggleSort = useCallback((key: SortKey) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const clearSearch = useCallback(() => setQuery(""), []);

  const resetAll = useCallback(() => {
    setQuery("");
    setSelectedStatuses([]);
    setSelectedDepartment("");
    setStartDateFrom("");
    setStartDateTo("");
    setSort({ key: "name", direction: "asc" });
  }, []);

  const hasActiveFilters = query || selectedStatuses.length > 0 || selectedDepartment || startDateFrom || startDateTo || sort.key !== "name" || sort.direction !== "asc";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mitarbeiter</h1>
          <p className="mt-2 text-sm text-gray-600">Verwalten Sie alle Mitarbeiter-Stammdaten</p>
        </div>
        <div className="flex items-center space-x-2">
          {canExport && (
            <button
              type="button"
              onClick={async () => {
                const result = await exportEmployeesToCSV();
                if (result.success && result.csv) {
                  const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `Mitarbeiter_${new Date().toISOString().slice(0, 10)}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }
              }}
              className="flex items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="h-5 w-5" />
              <span>Export CSV</span>
            </button>
          )}
          {canCreate && (
            <Link
              href="/dashboard/modules/employees/new"
              className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Neuer Mitarbeiter</span>
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nach Name, E-Mail, Position oder Abteilung suchen..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-10 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Suche leeren"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                showFilters || hasActiveFilters
                  ? "border-primary-600 bg-primary-50 text-primary-700"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filter</span>
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAll}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                title="Alle Filter und Sortierung zurücksetzen"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Zurücksetzen</span>
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid gap-4 border-t border-gray-200 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Status</label>
              <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                {Object.entries(statusLabels).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStatuses((prev) => [...prev, value]);
                        } else {
                          setSelectedStatuses((prev) => prev.filter((s) => s !== value));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="filter-department" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Abteilung
              </label>
              <select
                id="filter-department"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Alle Abteilungen</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="filter-start-from" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Eintrittsdatum von
              </label>
              <input
                id="filter-start-from"
                type="date"
                value={startDateFrom}
                onChange={(e) => setStartDateFrom(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="filter-start-to" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Eintrittsdatum bis
              </label>
              <input
                id="filter-start-to"
                type="date"
                value={startDateTo}
                onChange={(e) => setStartDateTo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {filteredEmployees.length} von {allEmployees.length} Mitarbeitern
          </span>
          {hasActiveFilters && (
            <span className="text-primary-600">
              Sortiert nach {tableHeaders.find((h) => h.key === sort.key)?.label} ({sort.direction === "asc" ? "aufsteigend" : "absteigend"})
            </span>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {filteredEmployees.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <UserIcon className="h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Keine Mitarbeiter gefunden</h3>
            <p className="mt-2 text-sm text-gray-500">{hasActiveFilters ? "Passen Sie die Filter oder Suche an." : "Erstellen Sie Ihren ersten Mitarbeiter."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {tableHeaders.map(({ key, label, sortable }) => (
                    <th
                      key={key}
                      onClick={() => sortable && toggleSort(key as SortKey)}
                      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${
                        sortable ? "cursor-pointer select-none hover:bg-gray-100 hover:text-gray-700" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span>{label}</span>
                        {sortable && (
                          <span className="inline-flex flex-col">
                            {sort.key === key && sort.direction === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5 text-primary-600" />
                            ) : sort.key === key && sort.direction === "desc" ? (
                              <ChevronDown className="h-3.5 w-3.5 text-primary-600" />
                            ) : (
                              <span className="h-3.5 w-3.5" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredEmployees.map((employee) => (
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
