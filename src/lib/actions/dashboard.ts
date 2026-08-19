"use server";

import { getExpiringDocuments } from "./employeeDocuments";
import { getExpiringQualifications } from "./employeeQualifications";
import { getUpcomingAbsences } from "./absences";
import { getProjects } from "./projects";
import { getTimeEntries } from "./timeTracking";
import { getWooCommerceOrders } from "./woocommerce";

export interface DashboardData {
  expiringDocuments: Awaited<ReturnType<typeof getExpiringDocuments>>["documents"];
  expiringQualifications: Awaited<ReturnType<typeof getExpiringQualifications>>;
  upcomingAbsences: Awaited<ReturnType<typeof getUpcomingAbsences>>;
  projects: Awaited<ReturnType<typeof getProjects>>;
  timeEntries: Awaited<ReturnType<typeof getTimeEntries>>;
  wooCommerceOrders: Awaited<ReturnType<typeof getWooCommerceOrders>>;
}

export async function getDashboardData(permissions: {
  documents: boolean;
  employees: boolean;
  absences: boolean;
  projects: boolean;
  timeTracking: boolean;
  woocommerce: boolean;
}): Promise<DashboardData> {
  // Execute sequentially to avoid concurrent pg client warnings.
  const expiringDocuments = permissions.documents
    ? (await getExpiringDocuments(5)).documents
    : [];

  const expiringQualifications = permissions.employees
    ? await getExpiringQualifications(90)
    : [];

  const upcomingAbsences = permissions.absences
    ? await getUpcomingAbsences()
    : [];

  const projects = permissions.projects
    ? await getProjects()
    : [];

  const timeEntries = permissions.timeTracking
    ? await getTimeEntries()
    : [];

  const wooCommerceOrders = permissions.woocommerce
    ? await getWooCommerceOrders()
    : [];

  return {
    expiringDocuments,
    expiringQualifications,
    upcomingAbsences,
    projects,
    timeEntries,
    wooCommerceOrders,
  };
}
