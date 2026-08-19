"use client";

import { useTransition } from "react";
import { setModuleActive } from "@/lib/actions/modules";

interface ModuleToggleProps {
  modules: Array<{
    id: string;
    name: string;
    key: string;
    isCore: boolean;
    isActive: boolean;
  }>;
}

export default function ModuleToggleList({ modules }: ModuleToggleProps) {
  const [isPending, startTransition] = useTransition();

  async function handleChange(moduleId: string, active: boolean) {
    startTransition(() => {
      setModuleActive(moduleId, active);
    });
  }

  return (
    <div className="mt-4 space-y-3">
      {modules.map((module) => (
        <div key={module.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
          <div>
            <p className="font-medium text-gray-900">{module.name} <span className="text-xs text-gray-500">({module.key})</span></p>
            {module.isCore && <span className="text-xs font-medium text-primary-600">Core</span>}
          </div>
          <label className="inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              defaultChecked={module.isActive}
              disabled={module.isCore || isPending}
              onChange={(e) => handleChange(module.id, e.currentTarget.checked)}
              className="peer sr-only"
            />
            <div className="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rtl:peer-checked:after:-translate-x-full"></div>
          </label>
        </div>
      ))}
    </div>
  );
}
