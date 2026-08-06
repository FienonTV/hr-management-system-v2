import { getEmployees } from "@/lib/actions/employees";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import EmployeesClient, { type EmployeeWithRelations } from "./EmployeesClient";

export default async function EmployeesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  try {
    const employees = await getEmployees();
    return <EmployeesClient initialEmployees={employees as unknown as EmployeeWithRelations[]} />;
  } catch (e) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Fehler beim Laden der Mitarbeiter: {e instanceof Error ? e.message : "Unbekannter Fehler"}
      </div>
    );
  }
}
