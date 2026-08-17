'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import type { WooCommerceSetting, WooCommerceOrder } from "@prisma/client";
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGO = "aes-256-cbc";
const KEY = Buffer.from(process.env.WOOCOMMERCE_ENCRYPTION_KEY || "0000000000000000000000000000000000000000000000000000000000000000", "hex");
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

export type WooCommerceOrderWithSetting = WooCommerceOrder & { setting: WooCommerceSetting };

export async function getWooCommerceSetting(): Promise<WooCommerceSetting | null> {
  const { tenantId } = await requirePermission("woocommerce:manage");
  return withTenant(tenantId, async (tx) => {
    return tx.wooCommerceSetting.findUnique({ where: { tenantId } });
  });
}

export async function saveWooCommerceSetting(data: {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  isActive?: boolean;
}): Promise<{ success: true } | { success: false; error: string }> {
  const { tenantId, session } = await requirePermission("woocommerce:manage");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.wooCommerceSetting.findUnique({ where: { tenantId } });
    const payload = {
      storeUrl: data.storeUrl,
      consumerKey: encrypt(data.consumerKey),
      consumerSecret: encrypt(data.consumerSecret),
      isActive: data.isActive ?? true,
    };
    if (existing) {
      await tx.wooCommerceSetting.update({ where: { tenantId }, data: payload });
    } else {
      await tx.wooCommerceSetting.create({ data: { tenantId, ...payload } });
    }

    revalidatePath("/dashboard/modules/admin/woocommerce");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "woocommerce.settings.update",
      resourceType: "woocommerceSetting",
      resourceId: tenantId,
      metadata: { storeUrl: data.storeUrl },
    });

    return { success: true };
  });
}

export async function syncWooCommerceOrders(): Promise<
  { success: true; count: number } | { success: false; error: string }
> {
  const { tenantId, session } = await requirePermission("woocommerce:read");
  return withTenant(tenantId, async (tx) => {
    const setting = await tx.wooCommerceSetting.findUnique({ where: { tenantId } });
    if (!setting || !setting.isActive) {
      return { success: false, error: "WooCommerce nicht konfiguriert oder inaktiv" };
    }

    const consumerKey = decrypt(setting.consumerKey);
    const consumerSecret = decrypt(setting.consumerSecret);
    const url = new URL("/wp-json/wc/v3/orders", setting.storeUrl).toString();
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    const res = await fetch(url + "?per_page=50&status=processing,completed,on-hold,pending", {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: `WooCommerce API Fehler: ${res.status} ${res.statusText}` };
    }

    const orders = (await res.json()) as any[];
    let count = 0;
    for (const order of orders) {
      await tx.wooCommerceOrder.upsert({
        where: { tenantId_externalOrderId: { tenantId, externalOrderId: String(order.id) } },
        update: {
          orderNumber: String(order.number || order.id),
          status: order.status || "unknown",
          total: order.total ? Number(order.total) : null,
          currency: order.currency || "EUR",
          customerName: `${order.billing?.first_name ?? ""} ${order.billing?.last_name ?? ""}`.trim() || null,
          dateCreated: order.date_created ? new Date(order.date_created) : new Date(),
          rawData: JSON.stringify(order),
        },
        create: {
          tenantId,
          externalOrderId: String(order.id),
          orderNumber: String(order.number || order.id),
          status: order.status || "unknown",
          total: order.total ? Number(order.total) : null,
          currency: order.currency || "EUR",
          customerName: `${order.billing?.first_name ?? ""} ${order.billing?.last_name ?? ""}`.trim() || null,
          dateCreated: order.date_created ? new Date(order.date_created) : new Date(),
          rawData: JSON.stringify(order),
        },
      });
      count++;
    }

    revalidatePath("/dashboard/modules/woocommerce/orders");
    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "woocommerce.sync",
      resourceType: "woocommerceOrder",
      resourceId: tenantId,
      metadata: { count },
    });

    return { success: true, count };
  });
}

export async function getWooCommerceOrders(): Promise<WooCommerceOrder[]> {
  const { tenantId } = await requirePermission("woocommerce:read");
  return withTenant(tenantId, async (tx) => {
    return tx.wooCommerceOrder.findMany({
      where: { tenantId },
      orderBy: { dateCreated: "desc" },
    });
  });
}
