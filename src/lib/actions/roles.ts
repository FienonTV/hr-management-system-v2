'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import type { Role, Permission } from "@prisma/client";

export type RoleWithPermissions = Role & {
  permissions: (Permission & { permission: Permission })[];
};

export async function getRoles(): Promise<Role[]> {
  const { tenantId } = await requirePermission("roles:read");
  return withTenant(tenantId, async (tx) => {
    return tx.role.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
  });
}

export async function getRoleById(id: string): Promise<Role & { permissions: Permission[] } | null> {
  const { tenantId } = await requirePermission("roles:read");
  return withTenant(tenantId, async (tx) => {
    const role = await tx.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    if (!role) return null;
    return {
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  });
}

export async function getAllPermissions(): Promise<Permission[]> {
  const { tenantId } = await requirePermission("roles:read");
  return withTenant(tenantId, async (tx) => {
    return tx.permission.findMany({
      orderBy: { key: "asc" },
    });
  });
}

export async function createRole(
  name: string,
  permissionKeys: string[]
): Promise<{ success: boolean; error?: string }> {
  const { tenantId } = await requirePermission("roles:create");

  if (!name.trim()) {
    return { success: false, error: "Name ist erforderlich" };
  }

  return withTenant(tenantId, async (tx) => {
    const existing = await tx.role.findUnique({
      where: { tenantId_name: { tenantId, name: name.trim() } },
    });
    if (existing) {
      return { success: false, error: "Eine Rolle mit diesem Namen existiert bereits" };
    }

    const permissions = await tx.permission.findMany({
      where: { key: { in: permissionKeys } },
    });

    await tx.role.create({
      data: {
        tenantId,
        name: name.trim(),
        isAdmin: false,
        permissions: {
          create: permissions.map((p) => ({
            permissionId: p.id,
            tenantId,
          })),
        },
      },
    });

    return { success: true };
  });
}

export async function updateRole(
  id: string,
  name: string,
  permissionKeys: string[]
): Promise<{ success: boolean; error?: string }> {
  const { tenantId } = await requirePermission("roles:update");

  if (!name.trim()) {
    return { success: false, error: "Name ist erforderlich" };
  }

  return withTenant(tenantId, async (tx) => {
    const existing = await tx.role.findUnique({
      where: { id },
    });
    if (!existing || existing.tenantId !== tenantId) {
      return { success: false, error: "Rolle nicht gefunden" };
    }

    const permissions = await tx.permission.findMany({
      where: { key: { in: permissionKeys } },
    });

    await tx.role.update({
      where: { id },
      data: {
        name: name.trim(),
        permissions: {
          deleteMany: {},
          create: permissions.map((p) => ({
            permissionId: p.id,
            tenantId,
          })),
        },
      },
    });

    return { success: true };
  });
}

export async function deleteRole(id: string): Promise<{ success: boolean; error?: string }> {
  const { tenantId } = await requirePermission("roles:delete");

  return withTenant(tenantId, async (tx) => {
    const existing = await tx.role.findUnique({
      where: { id },
    });
    if (!existing || existing.tenantId !== tenantId) {
      return { success: false, error: "Rolle nicht gefunden" };
    }
    if (existing.isAdmin) {
      return { success: false, error: "Die Admin-Rolle kann nicht gelöscht werden" };
    }

    await tx.role.delete({
      where: { id },
    });

    return { success: true };
  });
}
