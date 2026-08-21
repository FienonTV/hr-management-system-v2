"use server";

import { guardModule } from "@/lib/actions/moduleGuard";

export default async function RolesLayout({ children }: { children: React.ReactNode }) {
  await guardModule("roles", "roles:read");
  return <>{children}</>;
}
