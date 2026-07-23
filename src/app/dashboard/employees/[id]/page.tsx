import { getEmployeeById, updateEmployee, deleteEmployee } from "@/lib/actions/employees";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Employee } from "@prisma/client";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  try {
    const employee = (await getEmployeeById(id)) as Employee | null;
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
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mitarbeiter bearbeiten</h1>
            <p className="mt-2 text-sm text-gray-600">
              Bearbeiten Sie die Informationen von {employee.firstName} {employee.lastName}.
            </p>
          </div>
          <Link
            href="/dashboard/employees"
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            ← Zurück zur Übersicht
          </Link>
        </div>

        <form
          action={handleUpdate}
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6"
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                Vorname
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                defaultValue={employee.firstName}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Nachname
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                defaultValue={employee.lastName}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={employee.email || ""}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                Position
              </label>
              <input
                id="position"
                name="position"
                type="text"
                defaultValue={employee.position || ""}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                Abteilung
              </label>
              <input
                id="department"
                name="department"
                type="text"
                defaultValue={employee.department || ""}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Startdatum
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={employee.startDate?.toISOString().split("T")[0] || ""}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              type="submit"
              formAction={handleDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              Löschen
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            >
              Speichern
            </button>
          </div>
        </form>
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
