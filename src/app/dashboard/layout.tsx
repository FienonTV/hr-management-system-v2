import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { getEffectivePermissions } from "@/lib/permissions";
import { getEffectiveTenantId } from "@/lib/session";
import { buildSidebarItems } from "@/modules";
import { getActiveModuleKeys } from "@/lib/actions/modules";

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
  const [effectivePermissions, activeModuleKeys] = await Promise.all([
    getEffectivePermissions(session.user.id, tenantId),
    getActiveModuleKeys(tenantId),
  ]);

  const visibleItems = buildSidebarItems(activeModuleKeys, effectivePermissions);

  // Set active module keys cookie for middleware gating.
  const cookieStore = await cookies();
  cookieStore.set("activeModules", JSON.stringify(Array.from(activeModuleKeys)), {
    path: "/",
    maxAge: 86400,
    sameSite: "lax",
  });

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
