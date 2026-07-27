"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Edit } from "lucide-react";
import type { Employee } from "@prisma/client";

function initials(emp: Employee) {
  return `${emp.firstName?.charAt(0) ?? ""}${emp.lastName?.charAt(0) ?? ""}`.toUpperCase();
}

const statusLabels: Record<string, string> = {
  ACTIVE: "Aktiv",
  INACTIVE: "Inaktiv",
  ONBOARDING: "Einstellung",
  TERMINATED: "Ausgetreten",
};

export default function EmployeeRow({ employee }: { employee: Employee & { userAccount?: { id: string } | null } }) {
  const router = useRouter();

  return (
    <tr
      onClick={() => router.push(`/dashboard/modules/employees/${employee.id}`)}
      className="hover:bg-gray-50 cursor-pointer group"
    >
      <td className="whitespace-nowrap px-6 py-4">
        <div className="flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
            <span className="text-sm font-medium text-primary-600">{initials(employee)}</span>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
              {employee.firstName} {employee.lastName}
            </div>
            <div className="text-xs text-gray-500">
              {employee.employeeNumber || "Ohne Mitarbeiternummer"}
            </div>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{employee.email || '-'}</td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{employee.position || '-'}</td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{employee.department || '-'}</td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            employee.status === "ACTIVE"
              ? "bg-green-100 text-green-800"
              : employee.status === "ONBOARDING"
                ? "bg-yellow-100 text-yellow-800"
                : employee.status === "TERMINATED"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
          }`}
        >
          {statusLabels[employee.status] || employee.status}
        </span>
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
        {employee.startDate
          ? new Date(employee.startDate).toLocaleDateString("de-DE")
          : '-'}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
        {employee.userAccount ? (
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
        <div className="flex items-center justify-end">
          <Link
            href={`/dashboard/modules/employees/${employee.id}/edit`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary-600"
            title="Bearbeiten"
          >
            <Edit className="h-4 w-4" />
          </Link>
        </div>
      </td>
    </tr>
  );
}
