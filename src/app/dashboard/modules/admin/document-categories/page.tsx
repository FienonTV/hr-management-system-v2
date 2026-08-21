import { notFound } from "next/navigation";
import { guardModule } from "@/lib/actions/moduleGuard";
import { getDocumentCategories } from "@/lib/actions/documentCategories";
import { getCurrentUserPermissions } from "@/lib/actions/permissions";
import DocumentCategoriesClient from "./DocumentCategoriesClient";

export default async function DocumentCategoriesPage() {
  await guardModule("employees", "employees:read");
  const [result, permissions] = await Promise.all([
    getDocumentCategories(true),
    getCurrentUserPermissions(),
  ]);
  if (!result.success) {
    return notFound();
  }
  return (
    <DocumentCategoriesClient
      categories={result.categories}
      canManage={permissions.has("documentCategories:manage")}
    />
  );
}
