"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RoleForm from "@/components/roles/RoleForm";
import { createRole, getAllPermissions } from "@/lib/actions/roles";
import type { Permission } from "@prisma/client";

export default function NewRolePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  useEffect(() => {
    getAllPermissions()
      .then((data) => setPermissions(data))
      .catch(() => setError("Berechtigungen konnten nicht geladen werden"))
      .finally(() => setPermissionsLoading(false));
  }, []);

  async function handleSubmit(data: { name: string; description: string; permissions: string[] }) {
    setLoading(true);
    setError(null);

    try {
      const result = await createRole(data.name, data.description, data.permissions);
      if (!result.success) {
        setError(result.error || "Fehler beim Speichern");
        setLoading(false);
        return;
      }
      router.push("/dashboard/roles");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
      setLoading(false);
    }
  }

  if (permissionsLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center text-gray-500">
        Berechtigungen werden geladen...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Neue Rolle</h1>
          <p className="mt-2 text-sm text-gray-600">Erstellen Sie eine neue Rolle mit Berechtigungen.</p>
        </div>
      </div>

      <RoleForm
        onSubmit={handleSubmit}
        error={error}
        loading={loading}
        availablePermissions={permissions}
        submitLabel="Erstellen"
      />
    </div>
  );
}
