import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDailyPlan, getPlanningEmployees, getPlanningSettings, getActiveProjects } from "@/lib/actions/planning";
import { getAvailableVehicles } from "@/lib/actions/vehicles";
import { getEmployees } from "@/lib/actions/employees";
import { getDepartments } from "@/lib/actions/employeeCatalogs";
import PlanningClient from "./PlanningClient";

export default async function DailyPlanningPage({ params }: { params: Promise<{ date: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { date } = await params;

  const [planResult, employees, vehicles, settings, projects, departments, allEmployees] = await Promise.all([
    getDailyPlan(date),
    getPlanningEmployees(),
    getAvailableVehicles(),
    getPlanningSettings(),
    getActiveProjects(),
    getDepartments(),
    getEmployees(),
  ]);

  if (!planResult.success) {
    return (
      <div className="p-4 text-red-600">
        Fehler beim Laden der Einsatzplanung: {planResult.error}
      </div>
    );
  }

  if (!settings || ("success" in settings && settings.success === false)) {
    return (
      <div className="p-4 text-red-600">
        Fehler beim Laden der Planungseinstellungen.
      </div>
    );
  }

  return (
    <PlanningClient
      date={date}
      initialPlan={planResult.plan}
      isTemplate={planResult.isTemplate}
      isHoliday={planResult.isHoliday}
      holidayName={planResult.holidayName}
      employees={employees as any}
      allEmployees={allEmployees as any}
      vehicles={vehicles}
      settings={settings as any}
      projects={projects}
      departments={departments}
    />
  );
}
