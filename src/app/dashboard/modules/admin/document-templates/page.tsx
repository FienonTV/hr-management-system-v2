import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getDocumentTemplates,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
} from "@/lib/actions/documentTemplates";
import { getDocumentCategories } from "@/lib/actions/documentCategories";

export default async function DocumentTemplatesPage() {
  const [templatesResult, categoriesResult] = await Promise.all([
    getDocumentTemplates(true),
    getDocumentCategories(true),
  ]);

  if (!templatesResult.success || !categoriesResult.success) {
    return notFound();
  }

  const templates = templatesResult.templates;
  const categories = categoriesResult.categories;

  async function create(formData: FormData) {
    "use server";
    await createDocumentTemplate({
      name: String(formData.get("name")),
      description: String(formData.get("description") || ""),
      content: String(formData.get("content")),
      categoryId: String(formData.get("categoryId") || ""),
      isActive: formData.get("isActive") === "on",
    });
  }

  async function update(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    await updateDocumentTemplate(id, {
      name: String(formData.get("name")),
      description: String(formData.get("description") || ""),
      content: String(formData.get("content")),
      categoryId: String(formData.get("categoryId") || ""),
      isActive: formData.get("isActive") === "on",
    });
  }

  async function remove(formData: FormData) {
    "use server";
    await deleteDocumentTemplate(String(formData.get("id")));
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
      <p className="text-sm text-gray-600">
        HTML-Vorlagen mit Variablen wie {"{{firstName}}"}, {"{{lastName}}"}, {"{{employeeNumber}}"}, {"{{today}}"}, {"{{tenantName}}"}. PDFs werden aus diesen Vorlagen für Mitarbeiter generiert.
      </p>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Neue Vorlage</h2>
        <form action={create} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <input
              type="text"
              name="name"
              placeholder="Name der Vorlage"
              required
              className="rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select
              name="categoryId"
              className="rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Keine Kategorie</option>
              {categories
                .filter((c) => c.isActive)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="isActive" defaultChecked className="rounded" />
              Aktiv
            </label>
          </div>
          <input
            type="text"
            name="description"
            placeholder="Beschreibung"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <textarea
            name="content"
            placeholder="HTML-Inhalt..."
            required
            rows={8}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Vorlage erstellen
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Beschreibung</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Variablen</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Kategorie</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {templates.map((template) => (
              <tr key={template.id}>
                <td className="px-4 py-3 align-top text-sm text-gray-900">
                  <form action={update} className="space-y-2">
                    <input type="hidden" name="id" value={template.id} />
                    <input
                      type="text"
                      name="name"
                      defaultValue={template.name}
                      required
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </form>
                </td>
                <td className="px-4 py-3 align-top text-sm text-gray-900">
                  <form action={update}>
                    <input type="hidden" name="id" value={template.id} />
                    <input
                      type="text"
                      name="description"
                      defaultValue={template.description ?? ""}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </form>
                </td>
                <td className="px-4 py-3 align-top text-sm text-gray-900">
                  <span className="text-xs text-gray-500">
                    {template.variables.length > 0 ? template.variables.join(", ") : "—"}
                  </span>
                </td>
                <td className="px-4 py-3 align-top text-sm text-gray-900">
                  <form action={update}>
                    <input type="hidden" name="id" value={template.id} />
                    <select
                      name="categoryId"
                      defaultValue={template.categoryId ?? ""}
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="">Keine Kategorie</option>
                      {categories
                        .filter((c) => c.isActive || c.id === template.categoryId)
                        .map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </form>
                </td>
                <td className="px-4 py-3 align-top text-sm text-gray-900">
                  <form action={update}>
                    <input type="hidden" name="id" value={template.id} />
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={template.isActive}
                        className="rounded"
                      />
                      {template.isActive ? "Aktiv" : "Inaktiv"}
                    </label>
                  </form>
                </td>
                <td className="px-4 py-3 align-top text-right text-sm font-medium">
                  <div className="flex flex-col items-end gap-2">
                    <form action={update}>
                      <input type="hidden" name="id" value={template.id} />
                      <button
                        type="submit"
                        className="rounded bg-primary-100 px-3 py-1 text-xs text-primary-700 hover:bg-primary-200"
                      >
                        Speichern
                      </button>
                    </form>
                    <form action={remove}>
                      <input type="hidden" name="id" value={template.id} />
                      <button
                        type="submit"
                        className="rounded bg-red-100 px-3 py-1 text-xs text-red-700 hover:bg-red-200"
                      >
                        Deaktivieren
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
