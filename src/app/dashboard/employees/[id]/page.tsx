import { getEmployeeById, updateEmployee, deleteEmployee } from "@/lib/actions/employees";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Employee } from "@prisma/client";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {

  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  try {
    const employee = await getEmployeeById(id) as Employee | null;
    if (!employee) {
      return <div className="p-4 text-red-600">Mitarbeiter nicht gefunden.</div>;
    }

    async function handleUpdate(formData: FormData) {
      "use server";
      const data = {
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        email: String(formData.get("email") ?? "") || undefined,
        position: String(formData.get("position") ?? "") || undefined,
        department: String(formData.get("department") ?? "") || undefined,
        startDate: String(formData.get("startDate") ?? "") || undefined,
      };
      await updateEmployee(id, data);
    }

    async function handleDelete() {
      "use server";
      await deleteEmployee(id);
      redirect("/dashboard/employees");
    }

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Link href="/dashboard/employees" className="text-blue-600 hover:underline">Zurück</Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Mitarbeiter Details</CardTitle>
            <CardDescription>Bearbeiten Sie die Informationen von {employee.firstName} {employee.lastName}.</CardDescription>
          </CardHeader>
          <form action={handleUpdate}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Vorname</Label>
                  <Input id="firstName" name="firstName" defaultValue={employee.firstName} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nachname</Label>
                  <Input id="lastName" name="lastName" defaultValue={employee.lastName} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" name="email" type="email" defaultValue={employee.email || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input id="position" name="position" defaultValue={employee.position || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Abteilung</Label>
                <Input id="department" name="department" defaultValue={employee.department || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Startdatum</Label>
                <Input id="startDate" name="startDate" type="date" defaultValue={employee.startDate?.toISOString().split("T")[0] || ""} />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="destructive" type="submit" formAction={handleDelete}>Löschen</Button>
              <Button type="submit">Speichern</Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  } catch (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Fehler beim Laden des Mitarbeiters: {error instanceof Error ? error.message : "Unbekannter Fehler"}
      </div>
    );
  }
}
