"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RoleForm from "@/components/roles/RoleForm";
import { getRoleById, updateRole, deleteRole, getAllPermissions } from "@/lib/actions/roles";
import type { Permission, Role } from "@prisma/client";

type RoleWithPermissions = Role & {
  permissions: Permission[];
};

export default function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [role, setRole] = useState<RoleWithPermissions | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { id } = await params;
        const [roleData, allPermissions] = await Promise.all([
          getRoleById(id),
          getAllPermissions(),
        ]);
        if (cancelled) return;
        if (!roleData) {
          setError("Rolle nicht gefunden");
          return;
        }
        setRole(roleData);
        setPermissions(allPermissions);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Fehler beim Laden");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [params]);

  async function handleSubmit(data: { name: string; description: string; permissions: string[] }) {
    if (!role) return;
    setSaving(true);
    setError(null);

    try {
      const result = await updateRole(role.id, data.name, data.description, data.permissions);
      if (!result.success) {
        setError(result.error || "Fehler beim Speichern");
        setSaving(false);
        return;
      }
      router.push("/dashboard/roles");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!role) return;
    if (!confirm(`Rolle "${role.name}" wirklich löschen?`)) return;

    try {
      const result = await deleteRole(role.id);
      if (!result.success) {
        throw new Error(result.error || "Fehler beim Löschen");
      }
      router.push("/dashboard/roles");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Löschen");
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-gray-600">Laden...</p>
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error || "Rolle nicht gefunden"}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rolle bearbeiten</h1>
          <p className="mt-2 text-sm text-gray-600">Bearbeiten Sie die Berechtigungen der Rolle &quot;{role.name}&quot;.</p>
        </div>
      </div>

      <RoleForm
        onSubmit={handleSubmit}
        error={error}
        loading={saving}
        initial={{
          name: role.name,
          description: role.description || "",
          permissions: role.permissions.map((p) => p.key),
        }}
        availablePermissions={permissions}
        onDelete={role.isAdmin ? undefined : handleDelete}
        isAdmin={role.isAdmin}
      />
    </div>
  );
}
