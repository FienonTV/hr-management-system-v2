import { getAuditLogs } from "@/lib/actions/audit";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClipboardList, User, Shield, Users, Briefcase } from "lucide-react";

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
    "employee.create": "Mitarbeiter erstellt",
    "employee.update": "Mitarbeiter bearbeitet",
    "employee.delete": "Mitarbeiter gelöscht",
    "role.create": "Rolle erstellt",
    "role.update": "Rolle bearbeitet",
    "role.delete": "Rolle gelöscht",
    "user.role.assign": "Rolle zugewiesen",
    "user.role.remove": "Rolle entfernt",
  };
  return labels[action] || action;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const filters = await searchParams;
  const filterAction = filters.action;

  let logs: Awaited<ReturnType<typeof getAuditLogs>> = [];
  let error: string | null = null;

  try {
    logs = await getAuditLogs(200);
  } catch (e) {
    error = e instanceof Error ? e.message : "Fehler beim Laden des Audit-Logs";
  }

  if (filterAction) {
    logs = logs.filter((log) => log.action === filterAction || log.action.startsWith(filterAction.replace("*", "")));
  }

  const actionOptions = [
    { value: "", label: "Alle Aktionen" },
    { value: "auth.", label: "Authentifizierung" },
    { value: "employee.", label: "Mitarbeiter" },
    { value: "role.", label: "Rollen" },
    { value: "user.role.", label: "Benutzerrollen" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit-Log</h1>
          <p className="mt-2 text-sm text-gray-600">Sicherheitsrelevante Ereignisse im System.</p>
        </div>
      </div>

      <form className="flex items-center space-x-4" method="GET">
        <label className="text-sm font-medium text-gray-700" htmlFor="action">Filter:</label>
        <select
          id="action"
          name="action"
          defaultValue={filterAction || ""}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {actionOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          Anwenden
        </button>
      </form>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

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
                      {log.userId || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{log.ipAddress || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
