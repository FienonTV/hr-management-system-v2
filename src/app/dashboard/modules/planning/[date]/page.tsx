import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDailyPlan, getPlanningEmployees, getPlanningSettings, getActiveProjects, type DailyPlanWithSites } from "@/lib/actions/planning";
import { getAvailableVehicles } from "@/lib/actions/vehicles";
import { getEmployees } from "@/lib/actions/employees";
import { getDepartments } from "@/lib/actions/employeeCatalogs";
import PlanningClient from "./PlanningClient";

function serialize<T>(list: T[]): T[] {
  return JSON.parse(JSON.stringify(list)) as T[];
}

function serializePlan(plan: DailyPlanWithSites | null): DailyPlanWithSites | null {
  if (!plan) return null;
  return JSON.parse(JSON.stringify(plan));
}

export default async function DailyPlanningPage({ params }: { params: Promise<{ date: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { date } = await params;

  const [planResult, employeesRaw, vehiclesRaw, settingsRaw, projectsRaw, departments, allEmployeesRaw] = await Promise.all([
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

  const settings = settingsRaw && !("success" in settingsRaw && settingsRaw.success === false) ? settingsRaw : null;

  if (!settings) {
    return (
      <div className="p-4 text-red-600">
        Fehler beim Laden der Planungseinstellungen.
      </div>
    );
  }

  const typedSettings = settings as {
    defaultStartTime: string;
    defaultEndTime: string;
    autoCarryOver: boolean;
    weekendMode: "none" | "saturday" | "both";
    poolDepartmentIds: string[];
  };

  const employees = serialize(employeesRaw);
  const allEmployees = serialize(allEmployeesRaw);
  const vehicles = serialize(vehiclesRaw);
  const projects = serialize(projectsRaw);

  return (
    <PlanningClient
      date={date}
      initialPlan={serializePlan(planResult.plan)}
      isTemplate={planResult.isTemplate}
      isHoliday={planResult.isHoliday}
      holidayName={planResult.holidayName}
      employees={employees}
      allEmployees={allEmployees}
      vehicles={vehicles}
      settings={typedSettings}
      projects={projects}
      departments={departments}
    />
  );
}
