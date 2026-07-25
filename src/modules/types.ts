// Module configuration contract.
//
// Each module is registered manually in src/modules/index.ts. It exposes its
// routes, required permissions, and metadata. The dashboard sidebar is built
// from these configs at request time, filtered by module activation and the
// current user's effective permissions.

export type ModulePermissionConfig = {
  key: string;
  module: string;
  resource: string;
  action: string;
  description?: string;
};

export type ModuleMenuItemConfig = {
  id: string;
  label: string;
  path: string;
  iconKey: string;
  requiredPermission?: string;
};

export type ModuleConfig = {
  key: string;
  name: string;
  description?: string;
  iconKey: string;
  isCore?: boolean;
  permissions: ModulePermissionConfig[];
  menuItems: ModuleMenuItemConfig[];
};

// Extended menu item used by the dashboard layout. The label is resolved from
// the module config (German labels for now; labelKey support can be added once
// i18n is introduced).
export type ResolvedSidebarItem = {
  name: string;
  href: string;
  iconKey: string;
};
