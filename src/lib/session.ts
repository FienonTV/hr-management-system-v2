import { auth } from "@/lib/auth";
import { Session } from "next-auth";

// Liefert die effektive Tenant-ID aus der Session.
// Für normale Benutzer ist das user.tenantId.
// Impersonation für Systembetreuer wird später im Permission-System ergänzt.
export function getEffectiveTenantId(session: Session | null): string {
  if (!session?.user) {
    throw new Error("Keine gültige Session gefunden");
  }

  return session.user.tenantId;
}

// Server-side helper: Session + effektiver Tenant
export async function getServerSession() {
  const session = await auth();
  const tenantId = session ? getEffectiveTenantId(session) : null;
  return { session, tenantId };
}
