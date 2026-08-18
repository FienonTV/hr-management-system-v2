import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that are always allowed regardless of module activation.
const ALWAYS_ALLOWED_PATHS = new Set([
  "/dashboard",
  "/dashboard/modules/settings",
  "/dashboard/modules/admin/settings",
  "/dashboard/modules/admin/modules",
  "/dashboard/modules/admin/email",
  "/dashboard/modules/admin/woocommerce",
  "/dashboard/modules/admin/roles",
  "/dashboard/modules/admin/users",
  "/dashboard/modules/admin/document-categories",
  "/dashboard/modules/admin/document-templates",
  "/dashboard/modules/admin/qualifications",
]);

const CORE_MODULE_KEYS = new Set(["employees", "roles", "users", "files", "admin", "settings", "audit"]);

function getModuleKeyFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/modules\/([^\/]+)/);
  if (!match) return null;
  return match[1];
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/dashboard/modules/")) {
    return NextResponse.next();
  }

  if (ALWAYS_ALLOWED_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("next-auth.session-token")?.value ?? request.cookies.get("__Secure-next-auth.session-token")?.value;
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const moduleKey = getModuleKeyFromPath(pathname);
  if (!moduleKey) {
    return NextResponse.next();
  }

  if (CORE_MODULE_KEYS.has(moduleKey)) {
    return NextResponse.next();
  }

  const activeModulesCookie = request.cookies.get("activeModules")?.value;
  let activeKeys: string[] = [];
  if (activeModulesCookie) {
    try {
      activeKeys = JSON.parse(decodeURIComponent(activeModulesCookie));
    } catch {
      activeKeys = [];
    }
  }

  if (!activeKeys.includes(moduleKey)) {
    const url = new URL("/dashboard", request.url);
    url.searchParams.set("moduleDisabled", "true");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/modules/:path*"],
};
