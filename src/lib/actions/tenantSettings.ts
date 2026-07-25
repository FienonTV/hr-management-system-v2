'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function getTenantSettings() {
  const { tenantId } = await requirePermission("settings:read");
  return withTenant(tenantId, async (tx) => {
    const settings = await tx.tenantSetting.findMany({
      where: { tenantId },
      orderBy: { key: "asc" },
    });
    return settings;
  });
}

export async function updateTenantSetting(
  key: string,
  value: string
): Promise<{ success: boolean; error?: string }> {
  const { tenantId, session } = await requirePermission("settings:update");

  return withTenant(tenantId, async (tx) => {
    const forbidden = ["id", "tenantId", "createdAt", "updatedAt"];
    if (!key || forbidden.includes(key) || key.startsWith("_")) {
      return { success: false, error: "Ungültiger Setting-Key" };
    }

    await tx.tenantSetting.upsert({
      where: {
        tenantId_key: { tenantId, key },
      },
      update: { value, updatedById: session.user.id },
      create: {
        tenantId,
        key,
        value,
        updatedById: session.user.id,
      },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "tenant.settingUpdate",
      resourceType: "tenantSetting",
      resourceId: key,
      metadata: { key },
    });

    revalidatePath("/dashboard/modules/admin");
    return { success: true };
  });
}

export async function deleteTenantSetting(
  key: string
): Promise<{ success: boolean; error?: string }> {
  const { tenantId, session } = await requirePermission("settings:update");

  return withTenant(tenantId, async (tx) => {
    const existing = await tx.tenantSetting.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });

    if (!existing) {
      return { success: false, error: "Einstellung nicht gefunden" };
    }

    await tx.tenantSetting.delete({
      where: { tenantId_key: { tenantId, key } },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "tenant.settingDelete",
      resourceType: "tenantSetting",
      resourceId: key,
      metadata: { key },
    });

    revalidatePath("/dashboard/modules/admin");
    return { success: true };
  });
}

export type TenantSettingItem = Awaited<ReturnType<typeof getTenantSettings>>[number];
