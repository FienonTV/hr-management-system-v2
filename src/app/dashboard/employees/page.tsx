import { getEmployees } from "@/lib/actions/employees";
import { auth } from "@/lib/auth";
import { Employee } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { redirect } from "next/navigation";

export default async function EmployeesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  try {
    const employees = (await getEmployees()) as Employee[];
    return (

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Mitarbeiter</h1>
          <Link href="/dashboard/employees/new">
            <Button>Neuer Mitarbeiter</Button>
          </Link>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vorname</TableHead>
              <TableHead>Nachname</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell>{emp.firstName}</TableCell>
                <TableCell>{emp.lastName}</TableCell>
                <TableCell>{emp.email}</TableCell>
                <TableCell>{emp.position}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/employees/${emp.id}`} className="text-blue-600 hover:underline">Details</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
