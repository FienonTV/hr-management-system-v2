'use server';

import { auth } from "@/lib/auth";
import { getEffectiveTenantId } from "@/lib/session";
import { registeredModules, isCoreModule } from "@/modules";
import { prismaAdmin } from "@/lib/db/prisma";
import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function getActiveModuleKeys(tenantId: string): Promise<Set<string>> {
  return withTenant(tenantId, async (tx) => {
    const tenantModules = await tx.tenantModule.findMany({
      where: { tenantId, isActive: true },
      include: { module: true },
    });
    const keys = new Set(tenantModules.map((tm) => tm.module.key));
    for (const module of registeredModules) {
      if (module.isCore) keys.add(module.key);
    }
    return keys;
  });
}

export async function getModuleDefinitions() {
  const { tenantId } = await requirePermission("modules:manage");
  return withTenant(tenantId, async (tx) => {
    const definitions = await tx.moduleDefinition.findMany({
      orderBy: { key: "asc" },
    });
    const tenantModules = await tx.tenantModule.findMany({
      where: { tenantId },
      include: { module: true },
    });

    const tenantModuleByModuleId = new Map(tenantModules.map((tm) => [tm.moduleId, tm]));

    return definitions.map((def) => {
      const tenantModule = tenantModuleByModuleId.get(def.id);
      return {
        id: def.id,
        key: def.key,
        name: def.name,
        isCore: def.isCore,
        isActive: def.isCore || tenantModule?.isActive || false,
        tenantModuleId: tenantModule?.id,
      };
    });
  });
}

export async function setModuleActive(
  moduleId: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  const { tenantId, session } = await requirePermission("modules:manage");

  return withTenant(tenantId, async (tx) => {
    const moduleDef = await tx.moduleDefinition.findUnique({ where: { id: moduleId } });
    if (!moduleDef) {
      return { success: false, error: "Modul nicht gefunden" };
    }
    if (moduleDef.isCore || isCoreModule(moduleDef.key)) {
      return { success: false, error: "Core-Module können nicht deaktiviert werden" };
    }

    await tx.tenantModule.upsert({
      where: {
        tenantId_moduleId: { tenantId, moduleId },
      },
      update: { isActive: active },
      create: { tenantId, moduleId, isActive: active },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: active ? "tenant.activate" : "tenant.deactivate",
      resourceType: "tenantModule",
      resourceId: moduleId,
      metadata: { moduleKey: moduleDef.key },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/modules/admin/modules");
    return { success: true };
  });
}

export async function syncModuleDefinitions(): Promise<void> {
  for (const module of registeredModules) {
    await prismaAdmin.moduleDefinition.upsert({
      where: { key: module.key },
      update: {
        name: module.name,
        description: module.description ?? null,
        isCore: module.isCore ?? false,
      },
      create: {
        key: module.key,
        name: module.name,
        description: module.description ?? null,
        isCore: module.isCore ?? false,
      },
    });
  }
}

export async function requireModuleActive(moduleKey: string): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Nicht authentifiziert");
  }
  const tenantId = getEffectiveTenantId(session);
  const activeKeys = await getActiveModuleKeys(tenantId);
  if (!activeKeys.has(moduleKey)) {
    throw new Error("Modul ist für diese Firma nicht aktiviert");
  }
}

export async function checkModuleAccess(moduleKey: string): Promise<{ active: boolean; redirectUrl: string | null }> {
  const session = await auth();
  if (!session?.user) {
    return { active: false, redirectUrl: "/login" };
  }
  const tenantId = getEffectiveTenantId(session);
  const activeKeys = await getActiveModuleKeys(tenantId);
  if (!activeKeys.has(moduleKey)) {
    return { active: false, redirectUrl: "/dashboard?moduleDisabled=true" };
  }
  return { active: true, redirectUrl: null };
}
