import { createEmployee } from "@/lib/actions/employees";
import type { EmployeeInput } from "@/lib/schemas/employees";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function NewEmployeePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  async function handleSubmit(formData: FormData) {
    "use server";
    const data: EmployeeInput = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? "") || undefined,
      position: String(formData.get("position") ?? "") || undefined,
      department: String(formData.get("department") ?? "") || undefined,
      startDate: String(formData.get("startDate") ?? "") || undefined,
    };

    try {
      await createEmployee(data);
    } catch (error) {
      // Handle error (e.g. permission denied)
      throw error;
    }
    redirect("/dashboard/employees");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Neuer Mitarbeiter</CardTitle>
          <CardDescription>Geben Sie die Details des neuen Mitarbeiters ein.</CardDescription>
        </CardHeader>
        <form action={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Vorname</Label>
                <Input id="firstName" name="firstName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nachname</Label>
                <Input id="lastName" name="lastName" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input id="position" name="position" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Abteilung</Label>
              <Input id="department" name="department" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Startdatum</Label>
              <Input id="startDate" name="startDate" type="date" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Link href="/dashboard/employees">
              <Button variant="outline">Abbrechen</Button>
            </Link>
            <Button type="submit">Speichern</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
