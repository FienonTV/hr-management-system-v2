'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import type { EmailSetting } from "@prisma/client";
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGO = "aes-256-cbc";
const KEY = Buffer.from(process.env.EMAIL_ENCRYPTION_KEY || "0000000000000000000000000000000000000000000000000000000000000000", "hex");
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(value: string): string {
  const [ivHex, encrypted] = value.split(":");
  if (!ivHex || !encrypted) throw new Error("Invalid encrypted value");
  const decipher = createDecipheriv(ALGO, KEY, Buffer.from(ivHex, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export type EmailSettingForm = Omit<EmailSetting, "id" | "tenantId" | "createdAt" | "updatedAt" | "smtpPassword" | "imapPassword"> & {
  smtpPassword?: string;
  imapPassword?: string;
};

export async function getEmailSetting(): Promise<EmailSetting | null> {
  const { tenantId } = await requirePermission("email:manage");
  return withTenant(tenantId, async (tx) => {
    return tx.emailSetting.findUnique({ where: { tenantId } });
  });
}

export async function saveEmailSetting(data: EmailSettingForm): Promise<{ success: true } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("email:manage");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.emailSetting.findUnique({ where: { tenantId } });
    const payload: any = {
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
      smtpUser: data.smtpUser,
      smtpSecure: data.smtpSecure,
      imapHost: data.imapHost,
      imapPort: data.imapPort,
      imapUser: data.imapUser,
      imapSecure: data.imapSecure,
      fromAddress: data.fromAddress,
      fromName: data.fromName,
      isActive: data.isActive,
    };
    if (data.smtpPassword) payload.smtpPassword = encrypt(data.smtpPassword);
    if (data.imapPassword) payload.imapPassword = encrypt(data.imapPassword);

    if (existing) {
      if (!data.smtpPassword) payload.smtpPassword = existing.smtpPassword;
      if (!data.imapPassword) payload.imapPassword = existing.imapPassword;
      await tx.emailSetting.update({ where: { tenantId }, data: payload });
    } else {
      await tx.emailSetting.create({ data: { tenantId, ...payload } });
    }

    revalidatePath("/dashboard/modules/admin/email");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "email.settings.update",
      resourceType: "emailSetting",
      resourceId: tenantId,
    });

    return { success: true };
  });
}

export async function testEmailConnection(): Promise<{ success: true; message: string } | { success: false; error: string }> {
  const { tenantId } = await requirePermission("email:manage");
  return withTenant(tenantId, async (tx) => {
    const setting = await tx.emailSetting.findUnique({ where: { tenantId } });
    if (!setting || !setting.isActive) {
      return { success: false, error: "E-Mail nicht konfiguriert oder inaktiv" };
    }
    // Phase 3: Nur Konfiguration speichern, kein aktiver Versand.
    return { success: true, message: "Konfiguration vorhanden. Aktiver Versand kommt in Phase 4." };
  });
}
