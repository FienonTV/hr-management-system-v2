import Link from "next/link";
import { auth } from "@/lib/auth";
import { getEffectiveTenantId } from "@/lib/session";
import { getEffectivePermissions } from "@/lib/permissions";
import { getDashboardData } from "@/lib/actions/dashboard";
import { getActiveModuleKeys } from "@/lib/actions/modules";
import { absenceTypeLabel } from "@/lib/absenceUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plane, Briefcase, Euro, ShoppingCart } from "lucide-react";

import ModuleDisabledModal from "./ModuleDisabledModal";

async function DashboardPageContent() {
  const session = await auth();
  const tenantId = session ? getEffectiveTenantId(session) : "";
  const [effectivePermissions, activeModuleKeys] = await Promise.all([
    session && tenantId ? getEffectivePermissions(session.user.id, tenantId) : Promise.resolve(new Set<string>()),
    tenantId ? getActiveModuleKeys(tenantId) : Promise.resolve(new Set<string>()),
  ]);

  const canReadDocuments = effectivePermissions.has("documents:read") && activeModuleKeys.has("employees");
  const canReadEmployees = effectivePermissions.has("employees:read") && activeModuleKeys.has("employees");
  const canReadAbsences = effectivePermissions.has("absences:read") && activeModuleKeys.has("absences");
  const canReadProjects = effectivePermissions.has("projects:read") && activeModuleKeys.has("projects");
  const canReadTimeTracking = effectivePermissions.has("timeTracking:read") && activeModuleKeys.has("time-tracking");
  const canReadWooCommerce = effectivePermissions.has("woocommerce:read") && activeModuleKeys.has("woocommerce");

  const {
    expiringDocuments,
    expiringQualifications,
    upcomingAbsences,
    projects,
    timeEntries,
    wooCommerceOrders,
  } = await getDashboardData({
    documents: canReadDocuments,
    employees: canReadEmployees,
    absences: canReadAbsences,
    projects: canReadProjects,
    timeTracking: canReadTimeTracking,
    woocommerce: canReadWooCommerce,
  });

  const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
  const openMilestones = projects.reduce((sum, p) => sum + p.milestones.filter((m) => m.status === "OPEN").length, 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const thisMonthHours = timeEntries
    .filter((e) => {
      const d = new Date(e.date);
      return d >= monthStart && d <= monthEnd;
    })
    .reduce((sum, e) => sum + e.hours.toNumber(), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">Willkommen im HR Management System.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/modules/employees">
          <Card className="hover:border-primary-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Mitarbeiter</CardTitle>
              <Users className="h-5 w-5 text-primary-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">Verwaltung</p>
              <p className="text-xs text-gray-500">Stammdaten anlegen und bearbeiten</p>
            </CardContent>
          </Card>
        </Link>

        {canReadDocuments && (
          <Link href="/dashboard/modules/documents?status=expiring">
            <Card className="hover:border-yellow-300 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Ablaufende Dokumente</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
                  <span className="text-sm font-bold text-yellow-700">{expiringDocuments.length}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{expiringDocuments.length}</p>
                <p className="text-xs text-gray-500">Dokumente laufen in den nächsten 7 Tagen ab</p>
              </CardContent>
            </Card>
          </Link>
        )}

        {canReadEmployees && expiringQualifications.length > 0 && (
          <Link href="/dashboard/modules/employees?status=expiringQualifications">
            <Card className="hover:border-orange-300 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Ablaufende Qualifikationen</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                  <span className="text-sm font-bold text-orange-700">{expiringQualifications.length}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{expiringQualifications.length}</p>
                <p className="text-xs text-gray-500">Qualifikationen laufen in den nächsten 90 Tagen ab</p>
              </CardContent>
            </Card>
          </Link>
        )}

        {canReadAbsences && (
          <Link href="/dashboard/modules/absences">
            <Card className="hover:border-blue-300 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Anstehende Abwesenheiten</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-sm font-bold text-blue-700">{upcomingAbsences.length}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{upcomingAbsences.length}</p>
                <p className="text-xs text-gray-500">Genehmigte Abwesenheiten in den nächsten 30 Tagen</p>
              </CardContent>
            </Card>
          </Link>
        )}

        {canReadProjects && (
          <Link href="/dashboard/modules/projects">
            <Card className="hover:border-indigo-300 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Aktive Projekte</CardTitle>
                <Briefcase className="h-5 w-5 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{activeProjects}</p>
                <p className="text-xs text-gray-500">{projects.length} Projekte gesamt · {openMilestones} offene Meilensteine</p>
              </CardContent>
            </Card>
          </Link>
        )}

        {canReadTimeTracking && (
          <Link href="/dashboard/modules/time-tracking">
            <Card className="hover:border-green-300 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Zeitbuchungen diesen Monat</CardTitle>
                <Euro className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{thisMonthHours.toFixed(1)} h</p>
                <p className="text-xs text-gray-500">{timeEntries.filter((e) => e.status === "APPROVED").length} freigegebene Einträge</p>
              </CardContent>
            </Card>
          </Link>
        )}

        {canReadWooCommerce && (
          <Link href="/dashboard/modules/woocommerce/orders">
            <Card className="hover:border-purple-300 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">WooCommerce Bestellungen</CardTitle>
                <ShoppingCart className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{wooCommerceOrders.length}</p>
                <p className="text-xs text-gray-500">Synchronisierte Bestellungen</p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {canReadAbsences && upcomingAbsences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Abwesenheiten Übersicht</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-gray-200">
              {upcomingAbsences.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.employee.firstName} {a.employee.lastName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(a.startAt).toLocaleDateString("de-DE")} – {new Date(a.endAt).toLocaleDateString("de-DE")} · {absenceTypeLabel(a.type)}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/modules/employees/${a.employee.id}?tab=abwesenheiten`}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    Öffnen
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <DashboardPageContent />
      <ModuleDisabledModal />
    </>
  );
}
