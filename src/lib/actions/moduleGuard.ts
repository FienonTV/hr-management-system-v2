import { redirect } from "next/navigation";
import { checkModuleAccess } from "./modules";
import { getCurrentUserPermissions } from "@/lib/permissions";
import { registeredModules } from "@/modules";

export async function guardModule(moduleKey: string, requiredPermission?: string) {
  const { active, redirectUrl } = await checkModuleAccess(moduleKey);
  if (!active && redirectUrl) {
    redirect(redirectUrl);
  }

  if (requiredPermission) {
    const permissions = await getCurrentUserPermissions();
    if (!permissions.has(requiredPermission)) {
      redirect("/dashboard?moduleDisabled=true");
    }
  }
}

export function getModuleRequiredPermission(moduleKey: string): string | undefined {
  const module = registeredModules.find((m) => m.key === moduleKey);
  if (!module) return undefined;
  const readPerm = module.permissions.find((p) => p.action === "read");
  return readPerm?.key;
}
