import { getAuditLogs, getDistinctAuditActions, getDistinctAuditResourceTypes } from "@/lib/actions/audit";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClipboardList, User, Shield, Users, Briefcase, ChevronLeft, ChevronRight } from "lucide-react";
import { guardModule } from "@/lib/actions/moduleGuard";

const PAGE_SIZE = 50;

function actionIcon(action: string) {
  if (action.startsWith("auth.")) return <User className="h-4 w-4" />;
  if (action.startsWith("permissions.") || action.startsWith("role.")) return <Shield className="h-4 w-4" />;
  if (action.startsWith("user.")) return <Users className="h-4 w-4" />;
  if (action.startsWith("employee.")) return <Briefcase className="h-4 w-4" />;
  return <ClipboardList className="h-4 w-4" />;
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    "auth.login": "Anmeldung",
    "auth.logout": "Abmeldung",
    "auth.login_failed": "Anmeldung fehlgeschlagen",
    "auth.password_reset": "Passwort zurückgesetzt",
    "permissions.change": "Berechtigung geändert",
    "tenant.activate": "Tenant aktiviert",
    "tenant.deactivate": "Tenant deaktiviert",
    "file.upload": "Datei hochgeladen",
    "file.download": "Datei heruntergeladen",
    "employee.create": "Mitarbeiter erstellt",
    "employee.update": "Mitarbeiter bearbeitet",
    "employee.delete": "Mitarbeiter gelöscht",
    "role.create": "Rolle erstellt",
    "role.update": "Rolle bearbeitet",
    "role.delete": "Rolle gelöscht",
    "user.role.assign": "Rolle zugewiesen",
    "user.role.remove": "Rolle entfernt",
    "user.create": "Benutzer erstellt",
    "user.delete": "Benutzer gelöscht",
  };
  return labels[action] || action;
}

function userDisplayName(user: { email: string; firstName: string | null; lastName: string | null } | null) {
  if (!user) return "-";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name ? `${name} (${user.email})` : user.email;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; resourceType?: string; userId?: string; from?: string; to?: string; page?: string }>;
}) {
  await guardModule("audit");
  const session = await auth();
  if (!session?.user) redirect("/login");

  const filters = await searchParams;
  const page = Math.max(1, parseInt(filters.page || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { logs, total, hasMore } = await getAuditLogs({
    limit: PAGE_SIZE,
    offset,
    filters: {
      action: filters.action || undefined,
      resourceType: filters.resourceType || undefined,
      userId: filters.userId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    },
  });

  const [actions, resourceTypes] = await Promise.all([
    getDistinctAuditActions(),
    getDistinctAuditResourceTypes(),
  ]);

  function buildQueryString(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    Object.entries(changes).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    // Preserve existing filters not explicitly changed
    const preserved = {
      action: filters.action,
      resourceType: filters.resourceType,
      userId: filters.userId,
      from: filters.from,
      to: filters.to,
      page: filters.page,
    };
    Object.entries(preserved).forEach(([key, value]) => {
      if (value && !(key in changes)) params.set(key, value);
    });
    return params.toString();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit-Log</h1>
          <p className="mt-2 text-sm text-gray-600">Sicherheitsrelevante Ereignisse im System.</p>
        </div>
      </div>

      <form className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5" method="GET">
        <div>
          <label htmlFor="action" className="block text-xs font-medium text-gray-700">Aktion</label>
          <select
            id="action"
            name="action"
            defaultValue={filters.action || ""}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Alle Aktionen</option>
            {actions.map((action) => (
              <option key={action} value={action}>{actionLabel(action)}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="resourceType" className="block text-xs font-medium text-gray-700">Ressourcentyp</label>
          <select
            id="resourceType"
            name="resourceType"
            defaultValue={filters.resourceType || ""}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Alle Typen</option>
            {resourceTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="from" className="block text-xs font-medium text-gray-700">Von</label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={filters.from || ""}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="to" className="block text-xs font-medium text-gray-700">Bis</label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={filters.to || ""}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            Filtern
          </button>
          <a
            href="/dashboard/modules/audit"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Zurücksetzen
          </a>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {logs.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <ClipboardList className="h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Keine Einträge</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Zeit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Aktion</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ressource</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nutzer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">IP-Adresse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {new Date(log.createdAt).toLocaleString("de-DE")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-900">
                        {actionIcon(log.action)}
                        <span>{actionLabel(log.action)}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {log.resourceType}
                      {log.resourceId && <span className="ml-2 text-xs text-gray-500">({log.resourceId})</span>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {userDisplayName(log.user)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{log.ipAddress || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-700">
          <span>
            Zeige {offset + 1}–{offset + logs.length} von {total} Einträgen
          </span>
          <div className="flex items-center space-x-2">
            <a
              href={`/dashboard/modules/audit?${buildQueryString({ page: page > 1 ? String(page - 1) : undefined })}`}
              className={`rounded-lg border border-gray-300 bg-white px-3 py-2 hover:bg-gray-50 ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </a>
            <span className="px-2">Seite {page}</span>
            <a
              href={`/dashboard/modules/audit?${buildQueryString({ page: hasMore ? String(page + 1) : undefined })}`}
              className={`rounded-lg border border-gray-300 bg-white px-3 py-2 hover:bg-gray-50 ${!hasMore ? "pointer-events-none opacity-50" : ""}`}
            >
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
