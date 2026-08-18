import { employeesModule, rolesModule, usersModule, auditModule, filesModule, adminModule, projectsModule, timeTrackingModule, payrollModule, woocommerceModule, calendarModule, absencesModule, vehiclesModule, planningModule } from "./config";
import type { ModuleConfig, ResolvedSidebarItem } from "./types";

// Central module registry. Every module that should be available to the
// application must be imported and added to this array. Order defines the menu
// order within the dashboard sidebar.
export const registeredModules: ModuleConfig[] = [
  employeesModule,
  rolesModule,
  usersModule,
  projectsModule,
  timeTrackingModule,
  payrollModule,
  filesModule,
  adminModule,
  auditModule,
  calendarModule,
  absencesModule,
  vehiclesModule,
  planningModule,
  woocommerceModule,
];

// Core modules are always considered active, even when not present in
// tenant_modules.
export function isCoreModule(key: string): boolean {
  return registeredModules.find((m) => m.key === key)?.isCore === true;
}

// Build the list of sidebar items visible for a user, given their permission
// set. Only active modules are considered; module activation is looked up via
// the activeModules set (keys of tenant_modules where isActive=true).
export function buildSidebarItems(
  activeModuleKeys: Set<string>,
  effectivePermissions: Set<string>
): ResolvedSidebarItem[] {
  const items: ResolvedSidebarItem[] = [];

  // Dashboard is not a module and has no permission gate.
  items.push({ name: "Dashboard", href: "/dashboard", iconKey: "LayoutDashboard" });

  for (const module of registeredModules) {
    const isActive = module.isCore || activeModuleKeys.has(module.key);
    if (!isActive) continue;

    for (const menuItem of module.menuItems) {
      if (menuItem.requiredPermission && !effectivePermissions.has(menuItem.requiredPermission)) {
        continue;
      }
      items.push({
        name: menuItem.label,
        href: menuItem.path,
        iconKey: menuItem.iconKey,
      });
    }
  }

  return items;
}

export type { ModuleConfig, ResolvedSidebarItem };
export * from "./types";
