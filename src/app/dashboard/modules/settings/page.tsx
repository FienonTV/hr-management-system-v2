import { guardModule } from "@/lib/actions/moduleGuard";
import Link from "next/link";
import {
  Building2,
  Layers,
  Mail,
  ShoppingCart,
  Shield,
  UserCog,
  Tag,
  FileStack,
  Award,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getEffectivePermissions } from "@/lib/permissions";
import { getEffectiveTenantId } from "@/lib/session";

const settingsLinks = [
  { href: "/dashboard/modules/admin/settings", label: "Firmen-Einstellungen", icon: Building2, permission: "tenant:manage" },
  { href: "/dashboard/modules/admin/modules", label: "Module", icon: Layers, permission: "modules:manage" },
  { href: "/dashboard/modules/admin/email", label: "E-Mail-Einstellungen", icon: Mail, permission: "tenant:manage" },
  { href: "/dashboard/modules/admin/woocommerce", label: "WooCommerce-Einstellungen", icon: ShoppingCart, permission: "tenant:manage" },
  { href: "/dashboard/modules/admin/roles", label: "Rollen", icon: Shield, permission: "roles:read" },
  { href: "/dashboard/modules/admin/users", label: "Benutzer", icon: UserCog, permission: "users:read" },
  { href: "/dashboard/modules/admin/document-categories", label: "Dokumentenkategorien", icon: Tag, permission: "documentCategories:manage" },
  { href: "/dashboard/modules/admin/document-templates", label: "Dokumentenvorlagen", icon: FileStack, permission: "documentTemplates:manage" },
  { href: "/dashboard/modules/admin/qualifications", label: "Qualifikationen", icon: Award, permission: "qualifications:manage" },
];

export default async function SettingsPage() {
  await guardModule("settings");
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = getEffectiveTenantId(session);
  const permissions = await getEffectivePermissions(session.user.id, tenantId);

  const visibleLinks = settingsLinks.filter((link) => !link.permission || permissions.has(link.permission));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
      <p className="text-sm text-gray-600">Verwalte Firmen-Einstellungen, Module, E-Mail, WooCommerce und Stammdaten.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-primary-400 hover:bg-primary-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                <Icon className="h-5 w-5" />
              </div>
              <div className="font-medium text-gray-900">{link.label}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
