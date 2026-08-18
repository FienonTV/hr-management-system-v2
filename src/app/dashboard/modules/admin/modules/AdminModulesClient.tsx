"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setModuleActive } from "@/lib/actions/modules";

interface ModuleDef {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  isCore: boolean;
  isActive: boolean;
  tenantModuleId?: string;
}

export default function AdminModulesClient({ modules: initialModules }: { modules: ModuleDef[] }) {
  const router = useRouter();
  const [modules, setModules] = useState(initialModules);

  async function toggle(module: ModuleDef, active: boolean) {
    if (module.isCore) return;
    const result = await setModuleActive(module.id, active);
    if (result.success) {
      setModules((prev) => prev.map((m) => (m.id === module.id ? { ...m, isActive: active } : m)));
      router.refresh();
    }
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
              <label className="inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={module.isActive}
                  disabled={module.isCore}
                  onChange={(e) => toggle(module, e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500"></div>
              </label>
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
