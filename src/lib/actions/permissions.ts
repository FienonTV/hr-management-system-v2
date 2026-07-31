"use server";

import { auth } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { getEffectiveTenantId } from "@/lib/session";

/**
 * Server Action: Liefert die effektiven Permission-Keys des aktuellen Users.
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
