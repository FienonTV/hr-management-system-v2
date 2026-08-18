import { getModuleDefinitions } from "@/lib/actions/modules";
import AdminModulesClient from "./AdminModulesClient";

export default async function AdminModulesPage() {
  const modules = await getModuleDefinitions();
  return <AdminModulesClient modules={modules} />;
}
