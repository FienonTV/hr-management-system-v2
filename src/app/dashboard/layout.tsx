import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import Sidebar, { type SidebarItem } from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { getEffectivePermissions } from "@/lib/permissions";
import { getEffectiveTenantId } from "@/lib/session";
import { SIDEBAR_ITEMS } from "@/lib/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const tenantId = getEffectiveTenantId(session);
  const effectivePermissions = await getEffectivePermissions(session.user.id, tenantId);

  const visibleItems: SidebarItem[] = SIDEBAR_ITEMS
    .filter((item) => item.requiredPermissions.length === 0 || item.requiredPermissions.every((p) => effectivePermissions.has(p)))
    .map(({ name, href, iconKey }) => ({ name, href, iconKey }));

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar visibleItems={visibleItems} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
