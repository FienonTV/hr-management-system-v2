export type EmployeeFieldGroup =
  | "personal_info"
  | "employment"
  | "address"
  | "bank_tax"
  | "emergency"
  | "hr_misc";

export const EMPLOYEE_FIELD_GROUPS: EmployeeFieldGroup[] = [
  "personal_info",
  "employment",
  "address",
  "bank_tax",
  "emergency",
  "hr_misc",
];

export function readOwnPermission(group: EmployeeFieldGroup): string {
  return `employees:read:${group}:own`;
}

export function readAllPermission(group: EmployeeFieldGroup): string {
  return `employees:read:${group}:all`;
}

export function updateOwnPermission(group: EmployeeFieldGroup): string {
  return `employees:update:${group}:own`;
}

export function updateAllPermission(group: EmployeeFieldGroup): string {
  return `employees:update:${group}:all`;
}

/**
 * Checks whether the user can read a specific employee field group.
 * `isOwn` should be true when the employee record belongs to the current user.
 * Legacy permissions employees:read (all) and employees:read:all grant full access.
 * employees:read:own grants read access to all own groups unless a specific group permission is denied.
 */
export function canReadEmployeeGroup(
  permissions: Set<string>,
  group: EmployeeFieldGroup,
  isOwn: boolean
): boolean {
  if (permissions.has("employees:read") || permissions.has("employees:read:all")) {
    return true;
  }
  if (permissions.has(readAllPermission(group))) {
    return true;
  }
  if (isOwn && permissions.has("employees:read:own")) {
    return true;
  }
  if (isOwn && permissions.has(readOwnPermission(group))) {
    return true;
  }
  return false;
}

/**
 * Checks whether the user can update a specific employee field group.
 */
export function canUpdateEmployeeGroup(
  permissions: Set<string>,
  group: EmployeeFieldGroup,
  isOwn: boolean
): boolean {
  if (permissions.has("employees:update") || permissions.has("employees:update:all")) {
    return true;
  }
  if (permissions.has(updateAllPermission(group))) {
    return true;
  }
  if (isOwn && permissions.has("employees:update:own")) {
    return true;
  }
  if (isOwn && permissions.has(updateOwnPermission(group))) {
    return true;
  }
  return false;
}

/**
 * Returns all employee field group permission keys for seeding/DB insertion.
 */
export function getEmployeeFieldGroupPermissionDefinitions(): {
  key: string;
  module: string;
  resource: string;
  action: string;
  description: string;
}[] {
  const groups: { key: EmployeeFieldGroup; label: string }[] = [
    { key: "personal_info", label: "Persönliche Daten" },
    { key: "employment", label: "Beschäftigung" },
    { key: "address", label: "Adresse" },
    { key: "bank_tax", label: "Bankverbindung & Steuer" },
    { key: "emergency", label: "Notfallkontakt" },
    { key: "hr_misc", label: "HR-Sonstiges" },
  ];

  const defs: { key: string; module: string; resource: string; action: string; description: string }[] = [];
  for (const { key, label } of groups) {
    defs.push({
      key: readOwnPermission(key),
      module: "employees",
      resource: "employee",
      action: "read",
      description: `${label} (eigene Daten) anzeigen`,
    });
    defs.push({
      key: readAllPermission(key),
      module: "employees",
      resource: "employee",
      action: "read",
      description: `${label} (alle Daten) anzeigen`,
    });
    defs.push({
      key: updateOwnPermission(key),
      module: "employees",
      resource: "employee",
      action: "update",
      description: `${label} (eigene Daten) bearbeiten`,
    });
    defs.push({
      key: updateAllPermission(key),
      module: "employees",
      resource: "employee",
      action: "update",
      description: `${label} (alle Daten) bearbeiten`,
    });
  }
  return defs;
}
