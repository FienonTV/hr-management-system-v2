"use client";

import { useEffect, useState } from "react";
import { X, Upload, Download, Clock, FileText, Loader2, History } from "lucide-react";
import { getFileVersions, uploadNewVersion } from "@/lib/actions/files";
import type { FileRecord } from "@/lib/actions/files";
import { usePermissions } from "@/lib/hooks/usePermissions";

interface FileVersionsModalProps {
  fileId: string;
  title?: string;
  onClose: () => void;
  onVersionCreated?: () => void;
}

export function FileVersionsModal({ fileId, title, onClose, onVersionCreated }: FileVersionsModalProps) {
  const { has: hasPermission } = usePermissions();
  const canCreate = hasPermission("files:create");

  const [versions, setVersions] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await getFileVersions(fileId);
        if (!cancelled) setVersions(result);
      } catch (e) {
        if (!cancelled) setError("Fehler beim Laden der Versionen");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [fileId]);

  async function handleUploadNewVersion(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setUploading(true);
    setError(null);
    const result = await uploadNewVersion(fileId, selected);
    setUploading(false);

    if (!result.success) {
      setError((result as { error?: string }).error || "Upload fehlgeschlagen");
      return;
    }

    const updated = await getFileVersions(fileId);
    setVersions(updated);
    onVersionCreated?.();
  }

  function handleDownload(file: FileRecord) {
    // Use the generic file download route.
    window.open(`/api/files/${file.id}/download`, "_blank");
  }

  function formatDate(value?: Date | string | null): string {
    if (!value) return "–";
    return new Date(value).toLocaleString("de-DE");
  }

  function formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Versionen: {title || fileId}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-4">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {canCreate && (
            <div className="mb-4">
              <label className="inline-flex cursor-pointer items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {uploading ? "Wird hochgeladen..." : "Neue Version hochladen"}
                <input
                  type="file"
                  className="hidden"
                  onChange={handleUploadNewVersion}
                  disabled={uploading}
                />
              </label>
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : versions.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Keine Versionen gefunden.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Version</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Datei</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Hochgeladen</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Größe</th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {versions.map((v) => (
                    <tr key={v.id} className={v.isLatestVersion ? "bg-primary-50" : undefined}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <span className="inline-flex items-center gap-1">
                          {v.version}
                          {v.isLatestVersion && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Aktuell</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          {v.originalName}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(v.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">{formatBytes(v.sizeBytes)}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleDownload(v)}
                          className="inline-flex items-center rounded-md bg-white px-2 py-1 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        >
                          <Download className="mr-1 h-4 w-4" />
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
