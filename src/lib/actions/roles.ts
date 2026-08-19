'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import type { Role, Permission, User } from "@prisma/client";

export type RoleWithPermissions = Role & {
  permissions: Permission[];
};

export async function getRoles(): Promise<RoleWithPermissions[]> {
  const { tenantId } = await requirePermission("roles:read");
  return withTenant(tenantId, async (tx) => {
    const roles = await tx.role.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    return roles.map((role) => ({
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
    }));
  });
}

export async function getRoleById(id: string): Promise<RoleWithPermissions | null> {
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
    if (!role || role.tenantId !== tenantId) return null;
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
      orderBy: [{ module: "asc" }, { resource: "asc" }, { action: "asc" }],
    });
  });
}

export async function createRole(
  name: string,
  description: string,
  permissionKeys: string[]
): Promise<{ success: boolean; error?: string; roleId?: string }> {
  const { tenantId, session } = await requirePermission("roles:create");

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

    const role = await tx.role.create({
      data: {
        tenantId,
        name: name.trim(),
        description: description.trim() || null,
        isAdmin: false,
        permissions: {
          create: permissions.map((p) => ({
            permissionId: p.id,
            tenantId,
          })),
        },
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        userId: session.user.id,
        action: "role.create",
        resourceType: "role",
        resourceId: role.id,
        metadata: { name: role.name, description: role.description, permissions: permissionKeys },
        ipAddress: "unknown",
        userAgent: "unknown",
      },
    });

    return { success: true, roleId: role.id };
  });
}

export async function updateRole(
  id: string,
  name: string,
  description: string,
  permissionKeys: string[]
): Promise<{ success: boolean; error?: string }> {
  const { tenantId, session } = await requirePermission("roles:update");

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
    if (existing.isAdmin) {
      return { success: false, error: "Die Admin-Rolle kann nicht bearbeitet werden" };
    }

    const nameConflict = await tx.role.findFirst({
      where: {
        tenantId,
        name: name.trim(),
        id: { not: id },
      },
    });
    if (nameConflict) {
      return { success: false, error: "Eine Rolle mit diesem Namen existiert bereits" };
    }

    const permissions = await tx.permission.findMany({
      where: { key: { in: permissionKeys } },
    });

    const role = await tx.role.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description.trim() || null,
        permissions: {
          deleteMany: {},
          create: permissions.map((p) => ({
            permissionId: p.id,
            tenantId,
          })),
        },
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        userId: session.user.id,
        action: "role.update",
        resourceType: "role",
        resourceId: id,
        metadata: { name: role.name, description: role.description, permissions: permissionKeys },
        ipAddress: "unknown",
        userAgent: "unknown",
      },
    });

    return { success: true };
  });
}

export async function deleteRole(id: string): Promise<{ success: boolean; error?: string }> {
  const { tenantId, session } = await requirePermission("roles:delete");

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

    await tx.auditLog.create({
      data: {
        tenantId,
        userId: session.user.id,
        action: "role.delete",
        resourceType: "role",
        resourceId: id,
        metadata: { name: existing.name },
        ipAddress: "unknown",
        userAgent: "unknown",
      },
    });

    return { success: true };
  });
}

// --- User-Role management ---

export async function getUsers(): Promise<User[]> {
  const { tenantId } = await requirePermission("users:read");
  return withTenant(tenantId, async (tx) => {
    return tx.user.findMany({
      where: { tenantId },
      orderBy: { email: "asc" },
    });
  });
}

export async function getUserRoles(userId: string): Promise<Role[]> {
  const { tenantId } = await requirePermission("users:read");
  return withTenant(tenantId, async (tx) => {
    const userRoles = await tx.userRole.findMany({
      where: { userId, tenantId },
      include: { role: true },
    });
    return userRoles.map((ur) => ur.role);
  });
}

export async function assignRoleToUser(
  userId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  const { tenantId, session } = await requirePermission("users:update");

  return withTenant(tenantId, async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    const role = await tx.role.findUnique({ where: { id: roleId } });
    if (!user || user.tenantId !== tenantId) {
      return { success: false, error: "Benutzer nicht gefunden" };
    }
    if (!role || role.tenantId !== tenantId) {
      return { success: false, error: "Rolle nicht gefunden" };
    }

    await tx.userRole.upsert({
      where: {
        tenantId_userId_roleId: {
          tenantId,
          userId,
          roleId,
        },
      },
      update: {},
      create: {
        tenantId,
        userId,
        roleId,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        userId: session.user.id,
        action: "user.role.assign",
        resourceType: "user",
        resourceId: userId,
        metadata: { roleId, roleName: role.name, userEmail: user.email },
        ipAddress: "unknown",
        userAgent: "unknown",
      },
    });

    return { success: true };
  });
}

export async function removeRoleFromUser(
  userId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  const { tenantId, session } = await requirePermission("users:update");

  return withTenant(tenantId, async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    const role = await tx.role.findUnique({ where: { id: roleId } });

    await tx.userRole.deleteMany({
      where: {
        tenantId,
        userId,
        roleId,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        userId: session.user.id,
        action: "user.role.remove",
        resourceType: "user",
        resourceId: userId,
        metadata: { roleId, roleName: role?.name, userEmail: user?.email },
        ipAddress: "unknown",
        userAgent: "unknown",
      },
    });

    return { success: true };
  });
}
