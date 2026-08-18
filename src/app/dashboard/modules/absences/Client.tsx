"use client";

import { useEffect, useState } from "react";
import {
  getAbsenceRequests,
  createAbsenceRequest,
  approveAbsenceRequest,
  cancelAbsenceRequest,
  type AbsenceRequestRecord,
} from "@/lib/actions/absences";
import { absenceTypeLabel, absenceStatusLabel } from "@/lib/absenceUtils";
import { getEmployees } from "@/lib/actions/employees";
import { CheckCircle2, XCircle, Trash2, Plus, Save, X } from "lucide-react";

export default function AbsencesPage() {
  const [requests, setRequests] = useState<AbsenceRequestRecord[]>([]);
  const [employees, setEmployees] = useState<{ id: string; firstName: string; lastName: string; employeeNumber: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    type: "VACATION" as "VACATION" | "SICK" | "PARENTAL" | "UNPAID" | "OTHER",
    startAt: "",
    endAt: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [reqs, emps] = await Promise.all([
      getAbsenceRequests({}),
      getEmployees(),
    ]);
    setRequests(reqs);
    setEmployees(emps.map((e) => ({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      employeeNumber: e.employeeNumber ?? null,
    })));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    setError(null);
    const res = await createAbsenceRequest({
      employeeId: form.employeeId,
      type: form.type,
      startAt: form.startAt,
      endAt: form.endAt,
      notes: form.notes,
    });
    if (res.success) {
      setFormOpen(false);
      setForm({ employeeId: "", type: "VACATION", startAt: "", endAt: "", notes: "" });
      await load();
    } else {
      setError(res.error || "Fehler beim Speichern");
    }
  }

  async function handleApprove(id: string, decision: "APPROVED" | "REJECTED") {
    const res = await approveAbsenceRequest(id, decision);
    if (res.success) await load();
    else setError(res.error || "Fehler");
  }

  async function handleCancel(id: string) {
    if (!confirm("Antrag wirklich stornieren?")) return;
    const res = await cancelAbsenceRequest(id);
    if (res.success) await load();
    else setError(res.error || "Fehler");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Abwesenheiten</h1>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> Neu
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {formOpen && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select
              value={form.employeeId}
              onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Mitarbeiter wählen</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} {e.employeeNumber ? `(#${e.employeeNumber})` : ""}
                </option>
              ))}
            </select>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="VACATION">Urlaub</option>
              <option value="SICK">Krank</option>
              <option value="PARENTAL">Elternzeit</option>
              <option value="UNPAID">Unbezahlt</option>
              <option value="OTHER">Sonstiges</option>
            </select>
            <input
              type="date"
              value={form.startAt}
              onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              type="date"
              value={form.endAt}
              onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notizen"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 md:col-span-2"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"><Save className="h-4 w-4" /> Speichern</button>
            <button onClick={() => setFormOpen(false)} className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><X className="h-4 w-4" /> Abbrechen</button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Laden...</p>
        ) : requests.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">Keine Abwesenheitsanträge vorhanden.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mitarbeiter</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Typ</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Zeitraum</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {r.employee.firstName} {r.employee.lastName}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">{absenceTypeLabel(r.type)}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {new Date(r.startAt).toLocaleDateString("de-DE")} – {new Date(r.endAt).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                      r.status === "APPROVED"
                        ? "bg-green-100 text-green-800"
                        : r.status === "REJECTED"
                        ? "bg-red-100 text-red-800"
                        : r.status === "CANCELLED"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {absenceStatusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {r.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(r.id, "APPROVED")}
                          className="rounded-lg p-2 text-green-600 hover:bg-green-50"
                          title="Genehmigen"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleApprove(r.id, "REJECTED")}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          title="Ablehnen"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {r.status !== "CANCELLED" && (
                      <button
                        onClick={() => handleCancel(r.id)}
                        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                        title="Stornieren"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
