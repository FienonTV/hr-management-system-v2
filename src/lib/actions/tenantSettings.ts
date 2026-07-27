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

export interface LetterheadSettings {
  logoFileId: string | null;
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  footerText: string;
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
}

const LETTERHEAD_KEYS = [
  "letterhead.logoFileId",
  "letterhead.companyName",
  "letterhead.addressLine1",
  "letterhead.addressLine2",
  "letterhead.footerText",
  "letterhead.marginTop",
  "letterhead.marginBottom",
  "letterhead.marginLeft",
  "letterhead.marginRight",
];

const DEFAULT_MARGINS: Record<string, string> = {
  marginTop: "20mm",
  marginBottom: "20mm",
  marginLeft: "20mm",
  marginRight: "20mm",
};

export async function getLetterheadSettings(): Promise<LetterheadSettings> {
  const { tenantId } = await requirePermission("settings:read");
  const settings = await withTenant(tenantId, async (tx) => {
    return tx.tenantSetting.findMany({
      where: { tenantId, key: { in: LETTERHEAD_KEYS } },
    });
  });

  const map = new Map<string, string | null>(settings.map((s) => [s.key, s.value]));
  return {
    logoFileId: (map.get("letterhead.logoFileId") as string | null | undefined) || null,
    companyName: (map.get("letterhead.companyName") as string | undefined) || "",
    addressLine1: (map.get("letterhead.addressLine1") as string | undefined) || "",
    addressLine2: (map.get("letterhead.addressLine2") as string | undefined) || "",
    footerText: (map.get("letterhead.footerText") as string | undefined) || "",
    marginTop: (map.get("letterhead.marginTop") as string | undefined) || DEFAULT_MARGINS.marginTop,
    marginBottom: (map.get("letterhead.marginBottom") as string | undefined) || DEFAULT_MARGINS.marginBottom,
    marginLeft: (map.get("letterhead.marginLeft") as string | undefined) || DEFAULT_MARGINS.marginLeft,
    marginRight: (map.get("letterhead.marginRight") as string | undefined) || DEFAULT_MARGINS.marginRight,
  };
}

export async function updateLetterheadSettings(
  settings: Partial<LetterheadSettings>
): Promise<{ success: boolean; error?: string }> {
  const { tenantId, session } = await requirePermission("settings:update");

  return withTenant(tenantId, async (tx) => {
    const entries = Object.entries(settings).filter(
      (entry): entry is [keyof LetterheadSettings, string | null] =>
        typeof entry[1] === "string" || entry[1] === null
    );
    for (const [key, value] of entries) {
      const fullKey = `letterhead.${key}`;
      if (!LETTERHEAD_KEYS.includes(fullKey)) continue;
      await tx.tenantSetting.upsert({
        where: { tenantId_key: { tenantId, key: fullKey } },
        update: { value: value ?? "", updatedById: session.user.id },
        create: {
          tenantId,
          key: fullKey,
          value: value ?? "",
          updatedById: session.user.id,
        },
      });
    }

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "tenant.letterheadUpdate",
      resourceType: "tenantSetting",
      resourceId: "letterhead",
      metadata: { keys: entries.map(([key]) => key) },
    });

    revalidatePath("/dashboard/modules/admin/settings");
    return { success: true };
  });
}
