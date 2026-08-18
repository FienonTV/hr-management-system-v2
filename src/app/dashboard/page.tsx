import Link from "next/link";
import { auth } from "@/lib/auth";
import { getEffectiveTenantId } from "@/lib/session";
import { getEffectivePermissions } from "@/lib/permissions";
import { getExpiringDocuments } from "@/lib/actions/employeeDocuments";
import { getExpiringQualifications } from "@/lib/actions/employeeQualifications";
import { getUpcomingAbsences } from "@/lib/actions/absences";
import { absenceTypeLabel } from "@/lib/absenceUtils";
import { getProjects } from "@/lib/actions/projects";
import { getTimeEntries } from "@/lib/actions/timeTracking";
import { getWooCommerceOrders } from "@/lib/actions/woocommerce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Award, Clock, Plane, Briefcase, Euro, ShoppingCart } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const tenantId = session ? getEffectiveTenantId(session) : "";
  const effectivePermissions = session && tenantId ? await getEffectivePermissions(session.user.id, tenantId) : new Set<string>();
  const canReadDocuments = effectivePermissions.has("documents:read");
  const canReadEmployees = effectivePermissions.has("employees:read");
  const canReadAbsences = effectivePermissions.has("absences:read");
  const canReadProjects = effectivePermissions.has("projects:read");
  const canReadTimeTracking = effectivePermissions.has("timeTracking:read");
  const canReadWooCommerce = effectivePermissions.has("woocommerce:read");

  const [documentsResult, qualificationsResult, absencesResult, projectsResult, timeResult, wooResult] = await Promise.all([
    canReadDocuments ? getExpiringDocuments(5) : Promise.resolve({ success: true, documents: [] }),
    canReadEmployees ? getExpiringQualifications(90) : Promise.resolve([]),
    canReadAbsences ? getUpcomingAbsences() : Promise.resolve([]),
    canReadProjects ? getProjects() : Promise.resolve([]),
    canReadTimeTracking ? getTimeEntries() : Promise.resolve([]),
    canReadWooCommerce ? getWooCommerceOrders() : Promise.resolve([]),
  ]);

  const expiringDocs = documentsResult.success ? documentsResult.documents : [];
  const expiringQualifications = qualificationsResult;
  const upcomingAbsences = absencesResult;
  const projects = projectsResult;
  const timeEntries = timeResult;
  const wooCommerceOrders = wooResult;
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
                  <span className="text-sm font-bold text-yellow-700">{expiringDocs.length}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{expiringDocs.length}</p>
                <p className="text-xs text-gray-500">Dokumente laufen in den nächsten 7 Tagen ab</p>
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

      {canReadDocuments && expiringDocs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-base font-medium text-gray-900">Nächste Dokument-Abläufe</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-gray-100">
              {expiringDocs.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                    <p className="text-xs text-gray-500">
                      {doc.employee?.firstName ?? ""} {doc.employee?.lastName ?? ""}
                      {doc.employee?.employeeNumber && ` (#${doc.employee.employeeNumber})`} · Ablauf: {doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString("de-DE") : "-"}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/modules/employees/${doc.employeeId}?tab=dokumente`}
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

      {canReadEmployees && expiringQualifications.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Award className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-base font-medium text-gray-900">Ablaufende Qualifikationen</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-gray-100">
              {expiringQualifications.map((q) => (
                <li key={q.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{q.qualification.name}</p>
                    <p className="text-xs text-gray-500">
                      {q.employee.firstName} {q.employee.lastName} · Ablauf: {q.expiresAt ? new Date(q.expiresAt).toLocaleDateString("de-DE") : "-"}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/modules/employees/${q.employee.id}?tab=qualifikationen`}
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

      {canReadAbsences && upcomingAbsences.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Plane className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base font-medium text-gray-900">Anstehende Abwesenheiten</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-gray-100">
              {upcomingAbsences.map((a) => (
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
