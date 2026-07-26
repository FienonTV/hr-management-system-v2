import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getDocumentTemplates,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
} from "@/lib/actions/documentTemplates";
import { getDocumentCategories } from "@/lib/actions/documentCategories";
import { DocumentTemplatesClient } from "./DocumentTemplatesClient";

export default async function DocumentTemplatesPage() {
  const [templatesResult, categoriesResult] = await Promise.all([
    getDocumentTemplates(true),
    getDocumentCategories(true),
  ]);

  if (!templatesResult.success || !categoriesResult.success) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dokumentenvorlagen</h1>
        <Link
          href="/dashboard/modules/admin/document-categories"
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Kategorien verwalten →
        </Link>
      </div>

      <DocumentTemplatesClient
        templates={templatesResult.templates}
        categories={categoriesResult.categories}
        onCreate={createDocumentTemplate}
        onUpdate={updateDocumentTemplate}
        onDelete={deleteDocumentTemplate}
      />
    </div>
  );
}
