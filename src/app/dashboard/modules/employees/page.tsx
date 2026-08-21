import { getEmployees } from "@/lib/actions/employees";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import EmployeesClient, { type EmployeeWithRelations } from "./EmployeesClient";
import { guardModule } from "@/lib/actions/moduleGuard";
import { getCurrentUserPermissions } from "@/lib/permissions";

export default async function EmployeesPage() {
  await guardModule("employees", "employees:read");
  const session = await auth();
  if (!session?.user) redirect("/login");

  try {
    const [employees, permissions] = await Promise.all([getEmployees(), getCurrentUserPermissions()]);
    return (
      <EmployeesClient
        initialEmployees={employees as unknown as EmployeeWithRelations[]}
        permissions={Array.from(permissions)}
      />
    );
  } catch (e) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Fehler beim Laden der Mitarbeiter: {e instanceof Error ? e.message : "Unbekannter Fehler"}
      </div>
    );
  }
}
