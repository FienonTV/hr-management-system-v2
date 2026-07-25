export type SidebarItemConfig = {
  name: string;
  href: string;
  iconKey: string;
  requiredPermissions: string[];
};

export const SIDEBAR_ITEMS: SidebarItemConfig[] = [
  { name: "Dashboard", href: "/dashboard", iconKey: "LayoutDashboard", requiredPermissions: [] },
  { name: "Mitarbeiter", href: "/dashboard/employees", iconKey: "Users", requiredPermissions: ["employees:read"] },
  { name: "Rollen", href: "/dashboard/roles", iconKey: "Shield", requiredPermissions: ["roles:read"] },
  { name: "Benutzer", href: "/dashboard/users", iconKey: "UserCog", requiredPermissions: ["users:read"] },
  { name: "Audit-Log", href: "/dashboard/audit", iconKey: "ClipboardList", requiredPermissions: ["audit:read"] },
];
