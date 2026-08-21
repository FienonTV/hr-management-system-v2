import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { guardModule } from "@/lib/actions/moduleGuard";
import { getDailyPlan, getPlanningEmployees, getPlanningSettings, getActiveProjects, getPlanningDepartments, type DailyPlanWithSites } from "@/lib/actions/planning";
import { getAvailableVehicles } from "@/lib/actions/vehicles";
import { hasPermission } from "@/lib/permissions";
import { getEffectiveTenantId } from "@/lib/session";
import PlanningClient from "./PlanningClient";

function serialize<T>(list: T[]): T[] {
  return JSON.parse(JSON.stringify(list)) as T[];
}

function serializePlan(plan: DailyPlanWithSites | null): DailyPlanWithSites | null {
  if (!plan) return null;
  return JSON.parse(JSON.stringify(plan));
}

export default async function DailyPlanningPage({ params }: { params: Promise<{ date: string }> }) {
  await guardModule("planning", "planning:read");
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = getEffectiveTenantId(session);
  const canEdit = await hasPermission(session.user.id, tenantId, "planning:update");

  const { date } = await params;

  if (!canEdit) {
    redirect(`/dashboard/modules/planning/${date}/view`);
  }

  const [planResult, employeesRaw, vehiclesRaw, settingsRaw, projectsRaw, departments] = await Promise.all([
    getDailyPlan(date),
    getPlanningEmployees(),
    getAvailableVehicles(),
    getPlanningSettings(),
    getActiveProjects(),
    getPlanningDepartments(),
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
      vehicles={vehicles}
      settings={typedSettings}
      projects={projects}
      departments={departments}
    />
  );
}
