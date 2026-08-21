import { guardModule } from "@/lib/actions/moduleGuard";
import { getModuleDefinitions } from "@/lib/actions/modules";
import AdminModulesClient from "./AdminModulesClient";

export default async function AdminModulesPage() {
  await guardModule("admin");
  const modules = await getModuleDefinitions();
  return <AdminModulesClient modules={modules} />;
}
