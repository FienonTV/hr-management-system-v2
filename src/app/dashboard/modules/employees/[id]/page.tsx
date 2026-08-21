import { guardModule } from "@/lib/actions/moduleGuard";
import { notFound } from "next/navigation";
import { getEmployeeById } from "@/lib/actions/employees";
import { getCurrentUserPermissions } from "@/lib/permissions";
import EmployeeDetailClient from "./EmployeeDetailClient";
import type { Employee, FileItem } from "./types";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await guardModule("employees", "employees:read");
  const { id } = await params;
  const [employee, permissions] = await Promise.all([
    getEmployeeById(id),
    getCurrentUserPermissions(),
  ]);

  if (!employee) {
    notFound();
  }

  return (
    <EmployeeDetailClient
      employee={employee as unknown as Employee}
      initialFiles={[] as FileItem[]}
      permissions={Array.from(permissions)}
    />
  );
}
