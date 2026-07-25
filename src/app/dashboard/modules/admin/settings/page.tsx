import Link from "next/link";
import { notFound } from "next/navigation";
import { getModuleDefinitions, setModuleActive } from "@/lib/actions/modules";
import { getTenantSettings, updateTenantSetting, deleteTenantSetting } from "@/lib/actions/tenantSettings";

export default async function AdminSettingsPage() {
  const [modules, settings] = await Promise.all([
    getModuleDefinitions(),
    getTenantSettings(),
  ]);

  async function toggleModule(formData: FormData) {
    "use server";
    const moduleId = String(formData.get("moduleId"));
    const active = formData.get("active") === "on";
    await setModuleActive(moduleId, active);
  }

  async function saveSetting(formData: FormData) {
    "use server";
    const key = String(formData.get("key"));
    const value = String(formData.get("value"));
    await updateTenantSetting(key, value);
  }

  async function removeSetting(formData: FormData) {
    "use server";
    const key = String(formData.get("key"));
    await deleteTenantSetting(key);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Firmen-Einstellungen</h1>
        <Link
          href="/dashboard/modules/admin/modules"
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Module verwalten →
        </Link>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Module</h2>
        <p className="mt-1 text-sm text-gray-600">
          Aktiviere oder deaktiviere Module für diese Firma. Core-Module können nicht deaktiviert werden.
        </p>
        <div className="mt-4 space-y-3">
          {modules.map((module) => (
            <div key={module.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
              <div>
                <p className="font-medium text-gray-900">{module.name} <span className="text-xs text-gray-500">({module.key})</span></p>
                {module.isCore && <span className="text-xs font-medium text-primary-600">Core</span>}
              </div>
              <form action={toggleModule} className="flex items-center space-x-2">
                <input type="hidden" name="moduleId" value={module.id} />
                <label className="inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={module.isActive}
                    disabled={module.isCore}
                    value="on"
                    onChange={(e) => {
                      e.currentTarget.form?.requestSubmit();
                    }}
                    className="peer sr-only"
                  />
                  <div className="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rtl:peer-checked:after:-translate-x-full"></div>
                </label>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Tenant-Einstellungen</h2>
        <p className="mt-1 text-sm text-gray-600">
          Schlüssel-Wert-Einstellungen für diese Firma.
        </p>

        <form action={saveSetting} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
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
                      <form action={removeSetting}>
                        <input type="hidden" name="key" value={setting.key} />
                        <button
                          type="submit"
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Löschen
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
