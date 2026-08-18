import { redirect } from "next/navigation";
import { checkModuleAccess } from "./modules";

export async function guardModule(moduleKey: string) {
  const { active, redirectUrl } = await checkModuleAccess(moduleKey);
  if (!active && redirectUrl) {
    redirect(redirectUrl);
  }
}
