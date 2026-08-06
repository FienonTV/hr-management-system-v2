"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, FileText, Loader2, X, Download } from "lucide-react";
import { searchFiles } from "@/lib/actions/files";
import type { FileRecord } from "@/lib/actions/files";
import { FileVersionsModal } from "@/components/files/FileVersionsModal";

export function FileSearch() {
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setFiles([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await searchFiles(q, { limit: 50 });
      setFiles(result.files);
    } catch (e) {
      console.error("searchFiles error", e);
      setError(e instanceof Error ? e.message : "Suche fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  function formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Dateien durchsuchen (Name, Titel, Inhalt)"
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-10 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-gray-100"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {loading && (
        <div className="py-4 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!loading && query.trim() && files.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-500">Keine Dateien gefunden.</p>
      )}

      {files.length > 0 && (
        <div className="overflow-hidden rounded-md border border-gray-200">
          <ul className="divide-y divide-gray-200 bg-white">
            {files.map((file) => (
              <li key={file.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {file.title || file.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {file.originalName} • {formatBytes(file.sizeBytes)} • {file.mimeType}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedFileId(file.id)}
                    className="rounded-md bg-white px-2 py-1 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    Versionen
                  </button>
                  <a
                    href={`/api/files/${file.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-md bg-white px-2 py-1 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    <Download className="mr-1 h-4 w-4" />
                    Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedFileId && (
        <FileVersionsModal
          fileId={selectedFileId}
          title={files.find((f) => f.id === selectedFileId)?.title || files.find((f) => f.id === selectedFileId)?.originalName}
          onClose={() => setSelectedFileId(null)}
        />
      )}
    </div>
  );
}
