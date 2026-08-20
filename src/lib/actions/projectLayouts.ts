'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission, requireAnyPermission } from "@/lib/permissions";
import type { ProjectLayoutTab } from "@/lib/projectLayout";
import type { Prisma } from "@prisma/client";

export async function getProjectLayout(): Promise<{ tabs: ProjectLayoutTab[] } | null> {
  const { tenantId } = await requireAnyPermission("projects:read", "projectLayout:read", "projectLayout:update");
  return withTenant(tenantId, async (tx) => {
    const layout = await tx.projectLayout.findUnique({ where: { tenantId } });
    if (!layout) return null;
    return { tabs: layout.tabs as unknown as ProjectLayoutTab[] };
  });
}

export async function saveProjectLayout(tabs: ProjectLayoutTab[]): Promise<{ success: true } | { success: false; error: string }> {
  const { tenantId } = await requirePermission("projectLayout:update");

  if (!tabs.length) {
    return { success: false, error: "Mindestens ein Tab erforderlich" };
  }

  const seenCardIds = new Set<string>();
  const seenFieldIds = new Set<string>();
  for (const tab of tabs) {
    if (!tab.title?.trim()) {
      return { success: false, error: "Jeder Tab benötigt einen Titel" };
    }
    for (const card of tab.cards) {
      if (!card.title?.trim()) {
        return { success: false, error: "Jede Card benötigt einen Titel" };
      }
      if (card.columns < 1 || card.columns > 3) {
        return { success: false, error: "Eine Card darf nur 1, 2 oder 3 Spalten haben" };
      }
      if (seenCardIds.has(card.id)) return { success: false, error: "Doppelte Card-ID" };
      seenCardIds.add(card.id);
      for (const field of card.fields) {
        if (field.columnIndex < 0 || field.columnIndex >= card.columns) {
          return { success: false, error: `Feld ${field.definitionId} außerhalb der Spaltenrange` };
        }
        if (seenFieldIds.has(field.id)) return { success: false, error: "Doppelte Field-ID" };
        seenFieldIds.add(field.id);
      }
    }
  }

  return withTenant(tenantId, async (tx) => {
    await tx.projectLayout.upsert({
      where: { tenantId },
      create: {
        tenantId,
        tabs: tabs as unknown as Prisma.JsonArray,
      },
      update: {
        tabs: tabs as unknown as Prisma.JsonArray,
      },
    });
    return { success: true };
  });
}
