"use client";

import { useEffect, useState } from "react";
import {
  getEmployeeQualifications,
  createEmployeeQualification,
  updateEmployeeQualification,
  deleteEmployeeQualification,
} from "@/lib/actions/employeeQualifications";
import { getQualifications } from "@/lib/actions/qualifications";
import type { EmployeeQualificationRecord } from "@/lib/actions/employeeQualifications";
import type { Qualification } from "@prisma/client";
import { Pencil, Trash2, Save, X, Award, AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";

export default function QualifikationenTab({ employeeId }: { employeeId: string }) {
  const [records, setRecords] = useState<EmployeeQualificationRecord[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmployeeQualificationRecord | null>(null);
  const [form, setForm] = useState({
    qualificationId: "",
    issuedAt: "",
    expiresAt: "",
    notes: "",
  });
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [employeeId]);

  async function load() {
    setLoading(true);
    const [r, q] = await Promise.all([
      getEmployeeQualifications(employeeId),
      getQualifications(),
    ]);
    setRecords(r);
    setQualifications(q);
    setLoading(false);
  }

  function reset() {
    setEditing(null);
    setForm({ qualificationId: "", issuedAt: "", expiresAt: "", notes: "" });
    setCertificateFile(null);
    setError(null);
  }

  function startEdit(record: EmployeeQualificationRecord) {
    setEditing(record);
    setForm({
      qualificationId: record.qualificationId,
      issuedAt: record.issuedAt ? new Date(record.issuedAt).toISOString().split("T")[0] : "",
      expiresAt: record.expiresAt ? new Date(record.expiresAt).toISOString().split("T")[0] : "",
      notes: record.notes ?? "",
    });
    setCertificateFile(null);
    setError(null);
  }

  async function handleSave() {
    setError(null);
    const data = {
      qualificationId: form.qualificationId,
      issuedAt: form.issuedAt || null,
      expiresAt: form.expiresAt || null,
      notes: form.notes,
      certificateFile: certificateFile ?? undefined,
    };

    const res = editing
      ? await updateEmployeeQualification(editing.id, data)
      : await createEmployeeQualification(employeeId, data);

    if (res.success) {
      reset();
      await load();
    } else {
      setError(res.error || "Fehler beim Speichern");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Qualifikation "${name}" wirklich entfernen?`)) return;
    const res = await deleteEmployeeQualification(id);
    if (res.success) await load();
    else setError(res.error || "Fehler beim Löschen");
  }

  function statusFor(record: EmployeeQualificationRecord) {
    if (!record.expiresAt) return { label: "Gültig", color: "green", icon: CheckCircle2 };
    const days = Math.ceil((new Date(record.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: "Abgelaufen", color: "red", icon: AlertTriangle };
    if (days <= 90) return { label: `Ablaufend in ${days} Tagen`, color: "yellow", icon: Clock };
    return { label: "Gültig", color: "green", icon: CheckCircle2 };
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Qualifikation *</label>
            <select
              value={form.qualificationId}
              onChange={(e) => setForm((prev) => ({ ...prev, qualificationId: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">–</option>
              {qualifications.map((q) => (
                <option key={q.id} value={q.id}>{q.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Ausgestellt am</label>
            <input
              type="date"
              value={form.issuedAt}
              onChange={(e) => setForm((prev) => ({ ...prev, issuedAt: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Ablaufdatum</label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Zertifikat (PDF, Bild)</label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setCertificateFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-700 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Notizen</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Save className="h-4 w-4" />
            {editing ? "Speichern" : "Hinzufügen"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              Abbrechen
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Laden...</p>
        ) : records.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">Noch keine Qualifikationen vorhanden.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {records.map((record) => {
              const status = statusFor(record);
              const StatusIcon = status.icon;
              return (
                <li key={record.id} className="flex items-start justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary-600" />
                      <span className="text-sm font-medium text-gray-900">{record.qualification.name}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                        status.color === "green"
                          ? "bg-green-100 text-green-700"
                          : status.color === "yellow"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-700"
                      }`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {record.issuedAt && <span className="mr-2">Ausgestellt: {new Date(record.issuedAt).toLocaleDateString("de-DE")}</span>}
                      {record.expiresAt && <span>Ablauf: {new Date(record.expiresAt).toLocaleDateString("de-DE")}</span>}
                    </p>
                    {record.notes && <p className="text-xs text-gray-500">{record.notes}</p>}
                    {record.certificateFileId && (
                      <a
                        href={`/api/files/${record.certificateFileId}`}
                        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                      >
                        <FileText className="h-3 w-3" />
                        Zertifikat anzeigen
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(record)}
                      className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(record.id, record.qualification.name)}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
