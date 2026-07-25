import { getModuleDefinitions, setModuleActive } from "@/lib/actions/modules";

export default async function AdminModulesPage() {
  const modules = await getModuleDefinitions();

  async function toggleModule(formData: FormData) {
    "use server";
    const moduleId = String(formData.get("moduleId"));
    const active = formData.get("active") === "on";
    await setModuleActive(moduleId, active);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Module verwalten</h1>
      <p className="text-sm text-gray-600">
        Aktiviere oder deaktiviere Module für diese Firma. Core-Module können nicht deaktiviert werden.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <div key={module.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{module.name}</h3>
                <p className="text-xs text-gray-500">Key: {module.key}</p>
              </div>
              <form action={toggleModule}>
                <input type="hidden" name="moduleId" value={module.id} />
                <label className="inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={module.isActive}
                    disabled={module.isCore}
                    value="on"
                    onChange={(e) => e.currentTarget.form?.requestSubmit()}
                    className="peer sr-only"
                  />
                  <div className="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500"></div>
                </label>
              </form>
            </div>
            <div className="mt-3">
              {module.isCore ? (
                <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-800">Core-Modul</span>
              ) : module.isActive ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Aktiv</span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">Inaktiv</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
