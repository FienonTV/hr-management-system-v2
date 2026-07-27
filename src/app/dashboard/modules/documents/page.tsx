"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Search, Filter, BellOff, AlertTriangle, Clock, CheckCircle2, FileText, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { getAllDocuments, snoozeDocument, getDocumentVersions, deleteEmployeeDocument } from "@/lib/actions/employeeDocuments";
import type { DocumentContainerWithLatest } from "@/lib/actions/employeeDocuments";
import type { File as FileRecord } from "@prisma/client";

export default function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get("status") as "all" | "expired" | "expiring" | "valid") || "all";
  const initialQuery = searchParams.get("q") || "";

  const [documents, setDocuments] = useState<DocumentContainerWithLatest[]>([]);
  const [status, setStatus] = useState<"all" | "expired" | "expiring" | "valid">(initialStatus);
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [versions, setVersions] = useState<Record<string, FileRecord[]>>({});
  const [loadingVersions, setLoadingVersions] = useState<Set<string>>(new Set());

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
        setDocuments(result.documents);
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

  async function toggleExpanded(containerId: string) {
    const next = new Set(expanded);
    if (next.has(containerId)) {
      next.delete(containerId);
      setExpanded(next);
      return;
    }
    next.add(containerId);
    setExpanded(next);
    if (!versions[containerId] && !loadingVersions.has(containerId)) {
      setLoadingVersions((prev) => new Set(prev).add(containerId));
      const result = await getDocumentVersions(containerId);
      setLoadingVersions((prev) => {
        const updated = new Set(prev);
        updated.delete(containerId);
        return updated;
      });
      if (result.success) {
        setVersions((prev) => ({ ...prev, [containerId]: result.versions }));
      }
    }
  }

  async function handleSnooze(containerId: string) {
    const until = new Date();
    until.setDate(until.getDate() + 7);
    const result = await snoozeDocument(containerId, until.toISOString());
    if (!result.success) {
      setError((result as { error?: string }).error || "Snooze fehlgeschlagen");
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== containerId));
  }

  async function handleDelete(containerId: string, employeeId?: string | null) {
    if (!confirm("Dokument wirklich in den Papierkorb verschieben?")) return;
    const result = await deleteEmployeeDocument(containerId, employeeId ?? undefined);
    if (!result.success) {
      setError(result.error || "Löschen fehlgeschlagen");
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== containerId));
  }

  function statusBadge(doc: DocumentContainerWithLatest) {
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

  function formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return "0 B";
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
              <li key={doc.id} className="">
                <div className="flex items-start justify-between p-4 hover:bg-gray-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpanded(doc.id)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100"
                        title={expanded.has(doc.id) ? "Einklappen" : "Aufklappen"}
                      >
                        {expanded.has(doc.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <FileText className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900">{doc.title || doc.latestFile?.originalName || "Unbenannt"}</p>
                      {doc.versionCount > 1 && <span className="text-xs text-gray-500">({doc.versionCount} Versionen)</span>}
                      {statusBadge(doc)}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {doc.employee?.firstName} {doc.employee?.lastName}
                      {doc.employee?.employeeNumber && ` (#${doc.employee.employeeNumber})`}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {doc.latestFile?.originalName} · {formatBytes(doc.latestFile?.sizeBytes)} · Version {doc.latestFile?.version ?? 1}
                    </p>
                    {doc.expiresAt && (
                      <p className="mt-1 text-xs text-gray-500">
                        Ablaufdatum: {new Date(doc.expiresAt).toLocaleDateString("de-DE")}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <a
                      href={`/api/files/${doc.latestFile?.id}`}
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
                    {doc.employeeId && (
                      <Link
                        href={`/dashboard/modules/employees/${doc.employeeId}?tab=dokumente`}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                        title="Zum Mitarbeiter"
                      >
                        <FileText className="h-4 w-4" />
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(doc.id, doc.employeeId)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                      title="In Papierkorb verschieben"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {expanded.has(doc.id) && (
                  <div className="bg-gray-50 px-4 pb-4">
                    {loadingVersions.has(doc.id) ? (
                      <div className="py-2 text-sm text-gray-500">Versionen werden geladen...</div>
                    ) : (
                      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                        {(versions[doc.id] || []).map((v) => (
                          <li key={v.id} className="flex items-center justify-between px-4 py-2">
                            <div className="text-sm">
                              <span className="font-medium">Version {v.version}</span>
                              <span className="ml-2 text-xs text-gray-500">{v.originalName} · {formatBytes(v.sizeBytes)} · {new Date(v.createdAt).toLocaleDateString("de-DE")}</span>
                            </div>
                            <a
                              href={`/api/files/${v.id}`}
                              download
                              className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                              title="Herunterladen"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </li>
                        ))}
                        {(versions[doc.id] || []).length === 0 && (
                          <li className="px-4 py-2 text-sm text-gray-500">Keine Versionen gefunden.</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
