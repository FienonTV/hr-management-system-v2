"use server";

import { guardModule } from "@/lib/actions/moduleGuard";

export default async function EmployeesLayout({ children }: { children: React.ReactNode }) {
  await guardModule("employees", "employees:read");
  return <>{children}</>;
}
