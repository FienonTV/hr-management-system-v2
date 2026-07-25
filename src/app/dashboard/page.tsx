import Link from "next/link";
import { auth } from "@/lib/auth";
import { getEffectiveTenantId } from "@/lib/session";
import { getEffectivePermissions } from "@/lib/permissions";
import { getExpiringDocumentContainers } from "@/lib/actions/employeeDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, AlertTriangle, Clock } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const tenantId = session ? getEffectiveTenantId(session) : "";
  const effectivePermissions = session && tenantId ? await getEffectivePermissions(session.user.id, tenantId) : new Set<string>();
  const canReadDocuments = effectivePermissions.has("documents:read");

  let expiringDocs: Awaited<ReturnType<typeof getExpiringDocumentContainers>>["containers"] = [];
  if (canReadDocuments) {
    const result = await getExpiringDocumentContainers(5);
    if (result.success) {
      expiringDocs = result.containers;
    }
  }

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
      </div>

      {canReadDocuments && expiringDocs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-base font-medium text-gray-900">Nächste Abläufe</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-gray-100">
              {expiringDocs.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                    <p className="text-xs text-gray-500">
                      {doc.employee.firstName} {doc.employee.lastName}
                      {doc.employee.employeeNumber && ` (#${doc.employee.employeeNumber})`} · Ablauf: {doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString("de-DE") : "-"}
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
    </div>
  );
}
