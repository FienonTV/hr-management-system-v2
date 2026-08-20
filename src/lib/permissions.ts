import { withTenant } from "./db/tenant";
import { auth } from "./auth";
import { getEffectiveTenantId } from "./session";

export type PermissionKey = string;

// Liefert true, wenn der User die Admin-Rolle in diesem Tenant hat.
async function hasAdminRole(
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  userId: string
): Promise<boolean> {
  const adminRole = await tx.role.findFirst({
    where: {
      isAdmin: true,
      users: { some: { userId } },
    },
  });
  return !!adminRole;
}

/**
 * Returns all effective permission keys for a user in a tenant.
 * Admin roles receive all existing permissions.
 */
export async function getEffectivePermissions(
  userId: string,
  tenantId: string
): Promise<Set<string>> {
  return withTenant(tenantId, async (tx) => {
    const permissions = await tx.permission.findMany();

    if (await hasAdminRole(tx, userId)) {
      return new Set(permissions.map((p) => p.key));
    }

    const keys = new Set<string>();

    // Legacy compatibility: old employees:read grants employees:read:all behaviour
    const hasLegacyRead = permissions.some((p) => p.key === "employees:read");
    const hasLegacyUpdate = permissions.some((p) => p.key === "employees:update");
    if (hasLegacyRead) {
      keys.add("employees:read:all");
    }
    if (hasLegacyUpdate) {
      keys.add("employees:update:all");
    }

    const rolePermissions = await tx.rolePermission.findMany({
      where: {
        role: { users: { some: { userId } } },
      },
      include: { permission: true },
    });
    for (const rp of rolePermissions) {
      keys.add(rp.permission.key);
    }

    const userPermissions = await tx.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });
    for (const up of userPermissions) {
      if (up.granted) {
        keys.add(up.permission.key);
      } else {
        keys.delete(up.permission.key);
      }
    }

    return keys;
  });
}

/**
 * Checks if a user has a specific permission in a tenant.
 * Admin roles and system admins implicitly have all permissions.
 */
export async function hasPermission(
  userId: string,
  tenantId: string,
  permissionKey: string
): Promise<boolean> {
  const session = await auth();
  if (session?.user?.isSystemAdmin) {
    return true;
  }
  const keys = await getEffectivePermissions(userId, tenantId);
  return keys.has(permissionKey);
}

/**
 * Liefert die effektiven Permission-Keys des aktuellen Users.
 * Brauchbar für clientseitige UI-Gates (Buttons ein-/ausblenden).
 */
export async function getCurrentUserPermissions(): Promise<Set<string>> {
  const session = await auth();
  if (!session?.user) {
    return new Set();
  }
  const tenantId = getEffectiveTenantId(session);
  return getEffectivePermissions(session.user.id, tenantId);
}

/**
 * Prüft die Berechtigung für die aktuelle Session und liefert tenantId + session zurück.
 * Wirft Fehler bei fehlender Authentifizierung oder Berechtigung.
 */
export async function requirePermission(permissionKey: PermissionKey) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Nicht authentifiziert");
  }

  const tenantId = getEffectiveTenantId(session);
  const allowed = await hasPermission(session.user.id, tenantId, permissionKey);
  if (!allowed) {
    throw new Error("Keine Berechtigung");
  }

  return { session, tenantId };
}
