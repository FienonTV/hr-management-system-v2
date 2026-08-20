import Link from "next/link";
import { getTenantSettings, getLetterheadSettings } from "@/lib/actions/tenantSettings";
import LetterheadForm from "./LetterheadForm";
import TenantSettingsClient from "./TenantSettingsClient";

export default async function AdminSettingsPage() {
  const [settings, letterhead] = await Promise.all([
    getTenantSettings(),
    getLetterheadSettings(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Firmen-Einstellungen</h1>
        <Link
          href="/dashboard/modules/admin/modules"
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Module verwalten →
        </Link>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Module &amp; Rollen</h2>
        <p className="mt-1 text-sm text-gray-600">
          Module und Rollen werden in separaten Admin-Bereichen verwaltet.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/dashboard/modules/admin/modules"
            className="rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Module verwalten
          </Link>
          <Link
            href="/dashboard/modules/admin/roles"
            className="rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Rollen &amp; Berechtigungen
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Projekte</h2>
        <p className="mt-1 text-sm text-gray-600">
          Tabs, Sektionen und Felder der Projekt-Detailseite konfigurieren.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/dashboard/modules/admin/project-layout"
            className="rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Projekt-Layout-Editor
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Briefpapier / PDF-Ränder</h2>
        <p className="mt-1 text-sm text-gray-600">
          Logo, Adresse, Fußzeile und Ränder für generierte PDF-Dokumente festlegen.
        </p>
        <div className="mt-4">
          <LetterheadForm initial={letterhead} />
        </div>
      </section>

      <TenantSettingsClient settings={settings} />
    </div>
  );
}
