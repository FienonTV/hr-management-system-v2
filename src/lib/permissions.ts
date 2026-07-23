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
 * Checks if a user has a specific permission in a tenant.
 * Admin roles implicitly have all permissions.
 */
export async function hasPermission(
  userId: string,
  tenantId: string,
  permissionKey: string
): Promise<boolean> {
  return withTenant(tenantId, async (tx) => {
    if (await hasAdminRole(tx, userId)) return true;

    const rolePermissions = await tx.rolePermission.findMany({
      where: {
        role: { users: { some: { userId } } },
        permission: { key: permissionKey },
      },
    });
    if (rolePermissions.length > 0) return true;

    const userPermission = await tx.userPermission.findFirst({
      where: {
        userId,
        permission: { key: permissionKey },
      },
    });
    if (userPermission) return userPermission.granted;

    return false;
  });
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
