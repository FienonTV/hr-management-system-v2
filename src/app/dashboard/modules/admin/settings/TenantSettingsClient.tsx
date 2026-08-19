"use client";

import { useTransition } from "react";
import { updateTenantSetting, deleteTenantSetting } from "@/lib/actions/tenantSettings";

interface TenantSettingsClientProps {
  settings: Array<{ id: string; key: string; value: string }>;
}

export default function TenantSettingsClient({ settings }: TenantSettingsClientProps) {
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    const key = String(formData.get("key"));
    const value = String(formData.get("value"));
    startTransition(() => {
      updateTenantSetting(key, value);
    });
  }

  function handleDelete(key: string) {
    startTransition(() => {
      deleteTenantSetting(key);
    });
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-medium text-gray-900">Tenant-Einstellungen</h2>
      <p className="mt-1 text-sm text-gray-600">
        Schlüssel-Wert-Einstellungen für diese Firma.
      </p>

      <form action={handleSave} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input
          type="text"
          name="key"
          placeholder="Key"
          required
          className="rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <input
          type="text"
          name="value"
          placeholder="Value"
          required
          className="rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:col-span-1"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          Hinzufügen / Aktualisieren
        </button>
      </form>

      {settings.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Key</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Value</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {settings.map((setting) => (
                <tr key={setting.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">{setting.key}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{setting.value}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(setting.key)}
                      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
