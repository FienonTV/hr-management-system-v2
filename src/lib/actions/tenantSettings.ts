'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { uploadFile } from "./files";
import { revalidatePath } from "next/cache";

const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const ALLOWED_BACKGROUND_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const MAX_BACKGROUND_SIZE = 10 * 1024 * 1024;

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
      where: { tenantId_key: { tenantId, key } },
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
  mode: "upload" | "build";
  backgroundFileId: string | null;
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
  "letterhead.mode",
  "letterhead.backgroundFileId",
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
  const mode = map.get("letterhead.mode") || "build";
  return {
    mode: mode === "upload" || mode === "build" ? mode : "build",
    backgroundFileId: (map.get("letterhead.backgroundFileId") as string | null | undefined) || null,
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

export async function saveLetterheadSettings(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const { tenantId, session } = await requirePermission("settings:update");

  const modeRaw = String(formData.get("mode") || "build");
  const mode = modeRaw === "upload" || modeRaw === "build" ? modeRaw : "build";
  const logo = formData.get("logoFile") as File | null;
  const background = formData.get("backgroundFile") as File | null;

  const baseSettings: LetterheadSettings = {
    mode,
    backgroundFileId: null,
    logoFileId: null,
    companyName: String(formData.get("companyName") || ""),
    addressLine1: String(formData.get("addressLine1") || ""),
    addressLine2: String(formData.get("addressLine2") || ""),
    footerText: String(formData.get("footerText") || ""),
    marginTop: String(formData.get("marginTop") || "20mm"),
    marginBottom: String(formData.get("marginBottom") || "20mm"),
    marginLeft: String(formData.get("marginLeft") || "20mm"),
    marginRight: String(formData.get("marginRight") || "20mm"),
  };

  return withTenant(tenantId, async (tx) => {
    let logoFileId: string | null = null;
    if (logo && logo.size > 0) {
      if (!ALLOWED_LOGO_TYPES.includes(logo.type)) {
        throw new Error("Logo muss PNG oder JPEG sein.");
      }
      if (logo.size > MAX_LOGO_SIZE) {
        throw new Error("Logo darf maximal 2 MB groß sein.");
      }
      const result = await uploadFile(logo, { category: "DOCUMENT", title: "Briefpapier-Logo" });
      if (!result.success) {
        throw new Error("Logo-Upload fehlgeschlagen" + ("error" in result ? `: ${result.error}` : ""));
      }
      logoFileId = result.fileId;
    }

    let backgroundFileId: string | null = null;
    if (background && background.size > 0) {
      if (!ALLOWED_BACKGROUND_TYPES.includes(background.type)) {
        throw new Error("Briefbogen muss PDF, PNG oder JPEG sein.");
      }
      if (background.size > MAX_BACKGROUND_SIZE) {
        throw new Error("Briefbogen darf maximal 10 MB groß sein.");
      }
      const result = await uploadFile(background, { category: "DOCUMENT", title: "Briefpapier-Hintergrund" });
      if (!result.success) {
        throw new Error("Briefpapier-Upload fehlgeschlagen" + ("error" in result ? `: ${result.error}` : ""));
      }
      backgroundFileId = result.fileId;
    }

    // Preserve existing file ids if no new file was uploaded.
    const existing = await tx.tenantSetting.findMany({
      where: { tenantId, key: { in: ["letterhead.logoFileId", "letterhead.backgroundFileId"] } },
    });
    const existingMap = new Map<string, string | null>(existing.map((s) => [s.key, s.value]));
    const finalLogoFileId =
      logoFileId ?? (existingMap.get("letterhead.logoFileId") as string | null) ?? null;
    const finalBackgroundFileId =
      backgroundFileId ?? (existingMap.get("letterhead.backgroundFileId") as string | null) ?? null;

    const entries: [string, string | null][] = [
      ["letterhead.mode", mode],
      ["letterhead.logoFileId", finalLogoFileId],
      ["letterhead.backgroundFileId", finalBackgroundFileId],
      ["letterhead.companyName", baseSettings.companyName || null],
      ["letterhead.addressLine1", baseSettings.addressLine1 || null],
      ["letterhead.addressLine2", baseSettings.addressLine2 || null],
      ["letterhead.footerText", baseSettings.footerText || null],
      ["letterhead.marginTop", baseSettings.marginTop],
      ["letterhead.marginBottom", baseSettings.marginBottom],
      ["letterhead.marginLeft", baseSettings.marginLeft],
      ["letterhead.marginRight", baseSettings.marginRight],
    ];

    for (const [key, value] of entries) {
      await tx.tenantSetting.upsert({
        where: { tenantId_key: { tenantId, key } },
        update: { value: value ?? "", updatedById: session.user.id },
        create: { tenantId, key, value: value ?? "", updatedById: session.user.id },
      });
    }

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "tenant.letterheadUpdate",
      resourceType: "tenantSetting",
      resourceId: "letterhead",
      metadata: { mode, hasLogo: !!finalLogoFileId, hasBackground: !!finalBackgroundFileId },
    });

    revalidatePath("/dashboard/modules/admin/settings");
    return { success: true };
  });
}
