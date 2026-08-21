"use server";

import { guardModule } from "@/lib/actions/moduleGuard";

export default async function WoocommerceLayout({ children }: { children: React.ReactNode }) {
  await guardModule("woocommerce", "woocommerce:read");
  return <>{children}</>;
}
