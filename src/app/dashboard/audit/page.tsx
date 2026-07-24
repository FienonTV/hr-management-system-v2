import { getAuditLogs } from "@/lib/actions/audit";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClipboardList, User, Shield } from "lucide-react";

function actionIcon(action: string) {
  if (action.startsWith("auth.")) return <User className="h-4 w-4" />;
  if (action.startsWith("permissions.")) return <Shield className="h-4 w-4" />;
  return <ClipboardList className="h-4 w-4" />;
}

export default async function AuditLogPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let logs: Awaited<ReturnType<typeof getAuditLogs>> = [];
  let error: string | null = null;

  try {
    logs = await getAuditLogs(200);
  } catch (e) {
    error = e instanceof Error ? e.message : "Fehler beim Laden des Audit-Logs";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit-Log</h1>
        <p className="mt-2 text-sm text-gray-600">Sicherheitsrelevante Ereignisse im System.</p>
      </div>

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
                        <span>{log.action}</span>
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
