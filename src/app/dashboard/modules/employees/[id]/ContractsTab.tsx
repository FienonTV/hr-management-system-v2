"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import {
  getEmploymentContracts,
  createEmploymentContract,
  updateEmploymentContract,
  deleteEmploymentContract,
} from "@/lib/actions/employees";
import type { EmploymentContract } from "./types";
import type { EmploymentContractInput } from "@/lib/schemas/employees";
import { Field, toDateInputValue } from "./Field";

export default function ContractsTab({
  employeeId,
  contracts,
  onChange,
}: {
  employeeId: string;
  contracts: EmploymentContract[];
  onChange: (contracts: EmploymentContract[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const data: EmploymentContractInput = {
      title: String(formData.get("title")),
      contractType: String(formData.get("contractType")) as EmploymentContractInput["contractType"],
      startDate: new Date(String(formData.get("startDate"))),
      endDate: formData.get("endDate") ? new Date(String(formData.get("endDate"))) : undefined,
      weeklyHours: formData.get("weeklyHours") ? Number(formData.get("weeklyHours")) : undefined,
      salaryJson: String(formData.get("salaryJson") || "{}"),
      notes: String(formData.get("notes") || ""),
    };

    try {
      if (editingId) {
        const result = await updateEmploymentContract(editingId, data);
        if (!result.success) throw new Error(result.error || "Fehler beim Speichern");
      } else {
        const result = await createEmploymentContract(employeeId, data);
        if (!result.success) throw new Error(result.error || "Fehler beim Erstellen");
      }
      const updated = await getEmploymentContracts(employeeId);
      onChange(updated);
      setEditingId(null);
      (event.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Vertrag wirklich löschen?")) return;
    const result = await deleteEmploymentContract(id);
    if (!result.success) {
      setError(result.error || "Fehler beim Löschen");
      return;
    }
    const updated = await getEmploymentContracts(employeeId);
    onChange(updated);
  }

  const editingContract = editingId ? contracts.find((c) => c.id === editingId) : null;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          {editingId ? "Vertrag bearbeiten" : "Neuer Vertrag"}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Bezeichnung" name="title" defaultValue={editingContract?.title ?? ""} required />
          <div className="space-y-2">
            <label htmlFor="contractType" className="block text-sm font-medium text-gray-700">Vertragsart</label>
            <select
              id="contractType"
              name="contractType"
              defaultValue={editingContract?.contractType ?? "PERMANENT"}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
            >
              <option value="PERMANENT">Unbefristet</option>
              <option value="FIXED_TERM">Befristet</option>
              <option value="MINIJOB">Minijob</option>
              <option value="WORKER">Werkvertrag</option>
            </select>
          </div>
          <Field label="Beginn" name="startDate" type="date" defaultValue={toDateInputValue(editingContract?.startDate)} required />
          <Field label="Ende" name="endDate" type="date" defaultValue={toDateInputValue(editingContract?.endDate)} />
          <Field label="Wochenstunden" name="weeklyHours" type="number" defaultValue={editingContract?.weeklyHours?.toString() ?? ""} />
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 space-y-2">
            <label htmlFor="salaryJson" className="block text-sm font-medium text-gray-700">Gehaltsinformationen (JSON)</label>
            <textarea
              id="salaryJson"
              name="salaryJson"
              rows={3}
              defaultValue={editingContract?.salaryJson ?? "{}"}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 font-mono text-sm"
            />
          </div>
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 space-y-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notizen</label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={editingContract?.notes ?? ""}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Speichern..." : editingId ? "Aktualisieren" : "Hinzufügen"}</span>
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bezeichnung</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Art</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zeitraum</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wochenstunden</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {contracts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                  Keine Verträge vorhanden
                </td>
              </tr>
            ) : (
              contracts.map((contract) => (
                <tr key={contract.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{contract.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{contract.contractType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(contract.startDate).toLocaleDateString("de-DE")}
                    {contract.endDate && ` – ${new Date(contract.endDate).toLocaleDateString("de-DE")}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{contract.weeklyHours ?? "–"}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    <button
                      onClick={() => setEditingId(contract.id)}
                      className="text-primary-600 hover:text-primary-700 mr-3"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDelete(contract.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
