import { notFound } from "next/navigation";
import { getDocumentCategories } from "@/lib/actions/documentCategories";
import DocumentCategoriesClient from "./DocumentCategoriesClient";

export default async function DocumentCategoriesPage() {
  const result = await getDocumentCategories(true);
  if (!result.success) {
    return notFound();
  }
  return <DocumentCategoriesClient categories={result.categories} />;
}
