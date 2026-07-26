import { notFound } from "next/navigation";
import {
  getDocumentCategories,
  createDocumentCategory,
  updateDocumentCategory,
  deleteDocumentCategory,
} from "@/lib/actions/documentCategories";

export default async function DocumentCategoriesPage() {
  const result = await getDocumentCategories(true);
  if (!result.success) {
    return notFound();
  }
  const categories = result.categories;

  async function create(formData: FormData) {
    "use server";
    await createDocumentCategory({
      name: String(formData.get("name")),
      description: String(formData.get("description") || ""),
      color: String(formData.get("color") || "#3B82F6"),
      isActive: formData.get("isActive") === "on",
    });
  }

  async function update(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    await updateDocumentCategory(id, {
      name: String(formData.get("name")),
      description: String(formData.get("description") || ""),
      color: String(formData.get("color") || "#3B82F6"),
      isActive: formData.get("isActive") === "on",
    });
  }

  async function remove(formData: FormData) {
    "use server";
    await deleteDocumentCategory(String(formData.get("id")));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dokumentenkategorien</h1>
      <p className="text-sm text-gray-600">
        Verwalte Kategorien für Dokumente. Inaktive Kategorien bleiben an bestehenden Dokumenten erhalten, können aber nicht mehr neu zugeordnet werden.
      </p>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Neue Kategorie</h2>
        <form action={create} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-5">
          <input
            type="text"
            name="name"
            placeholder="Name"
            required
            className="rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="text"
            name="description"
            placeholder="Beschreibung"
            className="rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:col-span-2"
          />
          <div className="flex items-center gap-3">
            <input
              type="color"
              name="color"
              defaultValue="#3B82F6"
              className="h-11 w-11 rounded border border-gray-300 p-1"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="isActive" defaultChecked className="rounded" />
              Aktiv
            </label>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Hinzufügen
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Beschreibung</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Farbe</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <form action={update} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={category.id} />
                    <input
                      type="text"
                      name="name"
                      defaultValue={category.name}
                      required
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </form>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <form action={update}>
                    <input type="hidden" name="id" value={category.id} />
                    <input
                      type="text"
                      name="description"
                      defaultValue={category.description ?? ""}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </form>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <form action={update} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={category.id} />
                    <input
                      type="color"
                      name="color"
                      defaultValue={category.color}
                      className="h-8 w-8 rounded border border-gray-300 p-0.5"
                    />
                  </form>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <form action={update} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={category.id} />
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={category.isActive}
                        className="rounded"
                      />
                      {category.isActive ? "Aktiv" : "Inaktiv"}
                    </label>
                  </form>
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <form action={update}>
                      <input type="hidden" name="id" value={category.id} />
                      <button
                        type="submit"
                        className="rounded bg-primary-100 px-3 py-1 text-xs text-primary-700 hover:bg-primary-200"
                      >
                        Speichern
                      </button>
                    </form>
                    <form action={remove}>
                      <input type="hidden" name="id" value={category.id} />
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
