"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, RotateCcw, AlertTriangle, Search, Loader2 } from "lucide-react";
import { listDeletedFiles, restoreFile, permanentlyDeleteFile, cleanupTrash } from "@/lib/actions/files";
import type { FileRecord } from "@/lib/actions/files";
import { usePermissions } from "@/lib/hooks/usePermissions";

export default function FilesTrashPage() {
  const router = useRouter();
  const { has: hasPermission } = usePermissions();
  const canManage = hasPermission("files:manage");

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    setError(null);
    const result = await listDeletedFiles({ limit: 200 });
    setFiles(result.files);
    setTotal(result.total);
    setLoading(false);
  }

  useEffect(() => {
    if (!canManage) {
      router.replace("/dashboard");
      return;
    }
    load();
  }, [canManage, router]);

  function filteredFiles() {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) =>
      (f.originalName ?? "").toLowerCase().includes(q) ||
      (f.title ?? "").toLowerCase().includes(q)
    );
  }

  async function handleRestore(id: string) {
    setBusy((prev) => new Set(prev).add(id));
    const result = await restoreFile(id);
    setBusy((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (!result.success) {
      setError(result.error || "Wiederherstellung fehlgeschlagen");
      return;
    }
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function handlePermanentDelete(id: string) {
    if (!confirm("Datei endgültig löschen? Dies kann nicht rückgängig gemacht werden.")) return;
    setBusy((prev) => new Set(prev).add(id));
    const result = await permanentlyDeleteFile(id);
    setBusy((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (!result.success) {
      setError(result.error || "Löschen fehlgeschlagen");
      return;
    }
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleCleanup(days: number) {
    if (!confirm(`Alle Dateien im Papierkorb, die älter als ${days} Tage sind, endgültig löschen?`)) return;
    setLoading(true);
    const result = await cleanupTrash(days);
    setLoading(false);
    await load();
    alert(`${result.deleted} Datei(en) bereinigt.`);
  }

  if (!canManage) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Papierkorb</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gelöschte Dateien werden hier für 30 Tage aufbewahrt, bevor sie automatisch bereinigt werden.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCleanup(30)}
            disabled={loading || files.length === 0}
            className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Älter als 30 Tage bereinigen
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Gelöschte Dateien durchsuchen"
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Dateiname</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Titel</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Gelöscht am</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              ) : filteredFiles().length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    Keine gelöschten Dateien vorhanden.
                  </td>
                </tr>
              ) : (
                filteredFiles().map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{file.originalName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{file.title || "–"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {file.deletedAt ? new Date(file.deletedAt).toLocaleString("de-DE") : "–"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestore(file.id)}
                          disabled={busy.has(file.id)}
                          className="inline-flex items-center rounded-md bg-white px-2 py-1 text-sm font-medium text-green-700 ring-1 ring-inset ring-gray-300 hover:bg-green-50 disabled:opacity-50"
                        >
                          {busy.has(file.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="mr-1 h-4 w-4" />
                              Wiederherstellen
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(file.id)}
                          disabled={busy.has(file.id)}
                          className="inline-flex items-center rounded-md bg-white px-2 py-1 text-sm font-medium text-red-700 ring-1 ring-inset ring-gray-300 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Endgültig löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
          {filteredFiles().length} / {total} Dateien
        </div>
      </div>
    </div>
  );
}
