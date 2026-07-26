"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Search, Filter, BellOff, AlertTriangle, Clock, CheckCircle2, FileText, Trash2 } from "lucide-react";
import { getAllDocuments, snoozeDocument } from "@/lib/actions/employeeDocuments";
import { deleteFile } from "@/lib/actions/files";
import type { File as FileRecord } from "@prisma/client";

type DocumentListItem = FileRecord & {
  employee: { firstName: string | null; lastName: string | null; employeeNumber: string | null };
};

export default function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get("status") as "all" | "expired" | "expiring" | "valid") || "all";
  const initialQuery = searchParams.get("q") || "";

  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [status, setStatus] = useState<"all" | "expired" | "expiring" | "valid">(initialStatus as any);
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const result = await getAllDocuments({ status, search: query, limit: 200 });
      if (cancelled) return;
      if (!result.success) {
        setError((result as { error?: string }).error || "Fehler beim Laden");
        setDocuments([]);
      } else {
        setDocuments(result.documents as DocumentListItem[]);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [status, query]);

  function updateStatus(next: typeof status) {
    setStatus(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("status");
    else params.set("status", next);
    router.replace(`/dashboard/modules/documents?${params.toString()}`, { scroll: false });
  }

  function updateSearch(value: string) {
    setQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    router.replace(`/dashboard/modules/documents?${params.toString()}`, { scroll: false });
  }

  async function handleSnooze(fileId: string) {
    const until = new Date();
    until.setDate(until.getDate() + 7);
    const result = await snoozeDocument(fileId, until.toISOString());
    if (!result.success) {
      setError((result as { error?: string }).error || "Snooze fehlgeschlagen");
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== fileId));
  }

  async function handleDelete(fileId: string) {
    if (!confirm("Dokument wirklich in den Papierkorb verschieben?")) return;
    const result = await deleteFile(fileId);
    if (!result.success) {
      setError(result.error || "Löschen fehlgeschlagen");
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== fileId));
  }

  function statusBadge(doc: DocumentListItem) {
    const now = new Date();
    const expires = doc.expiresAt ? new Date(doc.expiresAt) : null;
    if (!expires) {
      return <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"><CheckCircle2 className="mr-1 h-3 w-3" />Gültig</span>;
    }
    if (expires < now) {
      return <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"><AlertTriangle className="mr-1 h-3 w-3" />Abgelaufen</span>;
    }
    const days = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 7) {
      return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800"><Clock className="mr-1 h-3 w-3" />Bald ablaufend ({days} Tage)</span>;
    }
    return <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"><CheckCircle2 className="mr-1 h-3 w-3" />Gültig</span>;
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dokumente</h1>
        <p className="mt-2 text-sm text-gray-600">Übersicht aller Mitarbeiter-Dokumente mit Ablaufstatus.</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Suche nach Titel, Mitarbeiter oder Notizen"
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={status}
            onChange={(e) => updateStatus(e.target.value as any)}
            className="rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Alle</option>
            <option value="valid">Gültig</option>
            <option value="expiring">Bald ablaufend</option>
            <option value="expired">Abgelaufen</option>
          </select>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Lade Dokumente...</div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Keine Dokumente gefunden.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-start justify-between p-4 hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">{doc.title || doc.originalName}</p>
                    {statusBadge(doc)}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {doc.employee.firstName} {doc.employee.lastName}
                    {doc.employee.employeeNumber && ` (#${doc.employee.employeeNumber})`}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {doc.originalName} · {formatBytes(doc.sizeBytes)} · Version {doc.version}
                  </p>
                  {doc.expiresAt && (
                    <p className="mt-1 text-xs text-gray-500">
                      Ablaufdatum: {new Date(doc.expiresAt).toLocaleDateString("de-DE")}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <a
                    href={`/api/files/${doc.id}`}
                    download
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                    title="Herunterladen"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleSnooze(doc.id)}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                    title="1 Woche ausblenden"
                  >
                    <BellOff className="h-4 w-4" />
                  </button>
                  <Link
                    href={`/dashboard/modules/employees/${doc.employeeId}?tab=dokumente`}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                    title="Zum Mitarbeiter"
                  >
                    <FileText className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                    title="In Papierkorb verschieben"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
