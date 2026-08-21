"use server";

import { guardModule } from "@/lib/actions/moduleGuard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await guardModule("admin");
  return <>{children}</>;
}
