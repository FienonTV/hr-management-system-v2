'use server';

import { prismaAdmin } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; email?: string; externalId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nicht authentifiziert" };
  }

  const user = await prismaAdmin.user.findUnique({
    where: { id: session.user.id },
    include: { tenant: true },
  });

  if (!user) {
    return { success: false, error: "Benutzer nicht gefunden" };
  }

  const bcrypt = await import("bcryptjs");
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash || "");
  if (!isValid) {
    return { success: false, error: "Aktuelles Passwort ist falsch" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prismaAdmin.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      forcePasswordChange: false,
    },
  });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "user.password_changed",
    resourceType: "user",
    resourceId: user.id,
    metadata: { reason: user.forcePasswordChange ? "forced_change" : "voluntary_change" },
  });

  revalidatePath("/dashboard");

  return { success: true, email: user.email, externalId: user.tenant.externalId };
}
