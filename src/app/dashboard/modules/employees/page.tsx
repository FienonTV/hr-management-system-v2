import { getEmployees } from "@/lib/actions/employees";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import EmployeesClient from "./EmployeesClient";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function EmployeesPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q } = await searchParams;

  try {
    const employees = await getEmployees(q);
    return <EmployeesClient initialEmployees={employees} initialQuery={q} />;
  } catch (e) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Fehler beim Laden der Mitarbeiter: {e instanceof Error ? e.message : "Unbekannter Fehler"}
      </div>
    );
  }
}
