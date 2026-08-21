"use server";

import { guardModule } from "@/lib/actions/moduleGuard";

export default async function FilesLayout({ children }: { children: React.ReactNode }) {
  await guardModule("files");
  return <>{children}</>;
}
