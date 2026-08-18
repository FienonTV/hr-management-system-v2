import type { ModuleConfig } from "./types";

export const employeesModule: ModuleConfig = {
  key: "employees",
  name: "Mitarbeiter",
  description: "Verwaltung aller Mitarbeiter-Stammdaten, Dokumente und Qualifikationen.",
  iconKey: "Users",
  isCore: true,
  permissions: [
    { key: "employees:read", module: "employees", resource: "employee", action: "read", description: "Mitarbeiter anzeigen" },
    { key: "employees:create", module: "employees", resource: "employee", action: "create", description: "Mitarbeiter erstellen" },
    { key: "employees:update", module: "employees", resource: "employee", action: "update", description: "Mitarbeiter bearbeiten" },
    { key: "employees:delete", module: "employees", resource: "employee", action: "delete", description: "Mitarbeiter löschen" },
    { key: "documents:read", module: "employees", resource: "document", action: "read", description: "Dokumente anzeigen" },
    { key: "documents:create", module: "employees", resource: "document", action: "create", description: "Dokumente erstellen" },
    { key: "documents:update", module: "employees", resource: "document", action: "update", description: "Dokumente bearbeiten" },
    { key: "documents:delete", module: "employees", resource: "document", action: "delete", description: "Dokumente löschen" },
    { key: "documentCategories:manage", module: "employees", resource: "documentCategory", action: "manage", description: "Dokumentenkategorien verwalten" },
    { key: "documentTemplates:manage", module: "employees", resource: "documentTemplate", action: "manage", description: "Dokumentenvorlagen verwalten" },
    { key: "documents:generate", module: "employees", resource: "document", action: "generate", description: "Dokumente aus Vorlagen generieren" },
    { key: "employees:invite", module: "employees", resource: "employee", action: "invite", description: "Mitarbeiter einladen" },
    { key: "employees:export", module: "employees", resource: "employee", action: "export", description: "Mitarbeiter als CSV exportieren" },
    { key: "departments:manage", module: "employees", resource: "department", action: "manage", description: "Abteilungen verwalten" },
    { key: "positions:manage", module: "employees", resource: "position", action: "manage", description: "Positionen verwalten" },
    { key: "payGrades:manage", module: "employees", resource: "payGrade", action: "manage", description: "Entgeltgruppen verwalten" },
    { key: "customFields:manage", module: "employees", resource: "customFieldDefinition", action: "manage", description: "Benutzerdefinierte Felder verwalten" },
    { key: "qualifications:manage", module: "employees", resource: "qualification", action: "manage", description: "Qualifikationen verwalten" },
  ],
  menuItems: [
    { id: "employees-list", label: "Mitarbeiter", path: "/dashboard/modules/employees", iconKey: "Users", requiredPermission: "employees:read" },
    { id: "employees-catalogs", label: "Stammdaten-Kataloge", path: "/dashboard/modules/employees/catalogs", iconKey: "Building2", requiredPermission: "departments:manage" },
    { id: "qualifications-admin", label: "Qualifikationen", path: "/dashboard/modules/admin/qualifications", iconKey: "Award", requiredPermission: "qualifications:manage" },
    { id: "documents-list", label: "Dokumente", path: "/dashboard/modules/documents", iconKey: "FileText", requiredPermission: "documents:read" },
    { id: "document-categories", label: "Dokumentenkategorien", path: "/dashboard/modules/admin/document-categories", iconKey: "Tag", requiredPermission: "documentCategories:manage" },
    { id: "document-templates", label: "Dokumentenvorlagen", path: "/dashboard/modules/admin/document-templates", iconKey: "FileStack", requiredPermission: "documentTemplates:manage" },
  ],
};

export const rolesModule: ModuleConfig = {
  key: "roles",
  name: "Rollen",
  description: "Rollen und Berechtigungen verwalten.",
  iconKey: "Shield",
  isCore: true,
  permissions: [
    { key: "roles:read", module: "roles", resource: "role", action: "read", description: "Rollen anzeigen" },
    { key: "roles:create", module: "roles", resource: "role", action: "create", description: "Rollen erstellen" },
    { key: "roles:update", module: "roles", resource: "role", action: "update", description: "Rollen bearbeiten" },
    { key: "roles:delete", module: "roles", resource: "role", action: "delete", description: "Rollen löschen" },
  ],
  menuItems: [
    { id: "roles-list", label: "Rollen", path: "/dashboard/modules/roles", iconKey: "Shield", requiredPermission: "roles:read" },
  ],
};

export const usersModule: ModuleConfig = {
  key: "users",
  name: "Benutzer",
  description: "Benutzer-Accounts und Einladungen verwalten.",
  iconKey: "UserCog",
  isCore: true,
  permissions: [
    { key: "users:read", module: "users", resource: "user", action: "read", description: "Benutzer anzeigen" },
    { key: "users:update", module: "users", resource: "user", action: "update", description: "Benutzer verwalten" },
    { key: "users:invite", module: "users", resource: "user", action: "invite", description: "Benutzer einladen" },
  ],
  menuItems: [
    { id: "users-list", label: "Benutzer", path: "/dashboard/modules/users", iconKey: "UserCog", requiredPermission: "users:read" },
  ],
};

export const auditModule: ModuleConfig = {
  key: "audit",
  name: "Audit-Log",
  description: "Sicherheitsrelevante Ereignisse einsehen.",
  iconKey: "ClipboardList",
  isCore: true,
  permissions: [
    { key: "audit:read", module: "audit", resource: "auditLog", action: "read", description: "Audit-Log anzeigen" },
  ],
  menuItems: [
    { id: "audit-list", label: "Audit-Log", path: "/dashboard/modules/audit", iconKey: "ClipboardList", requiredPermission: "audit:read" },
  ],
};

export const filesModule: ModuleConfig = {
  key: "files",
  name: "Dateien",
  description: "Dateien und Dokumente verwalten.",
  iconKey: "FileText",
  isCore: true,
  permissions: [
    { key: "files:read", module: "files", resource: "file", action: "read", description: "Dateien anzeigen" },
    { key: "files:create", module: "files", resource: "file", action: "create", description: "Dateien hochladen" },
    { key: "files:delete", module: "files", resource: "file", action: "delete", description: "Dateien löschen" },
    { key: "files:manage", module: "files", resource: "file", action: "manage", description: "Alle Dateien verwalten" },
    { key: "files:restore", module: "files", resource: "file", action: "restore", description: "Dateien aus Papierkorb wiederherstellen" },
  ],
  menuItems: [
    { id: "files-trash", label: "Papierkorb", path: "/dashboard/modules/files/trash", iconKey: "Trash2", requiredPermission: "files:manage" },
  ],
};

export const adminModule: ModuleConfig = {
  key: "admin",
  name: "Administration",
  description: "Firmen-Einstellungen und Module verwalten.",
  iconKey: "Settings",
  isCore: true,
  permissions: [
    { key: "tenant:manage", module: "admin", resource: "tenant", action: "manage", description: "Firmen-Einstellungen verwalten" },
    { key: "modules:manage", module: "admin", resource: "module", action: "manage", description: "Module aktivieren/deaktivieren" },
  ],
  menuItems: [
    { id: "admin-settings", label: "Firmen-Einstellungen", path: "/dashboard/modules/admin/settings", iconKey: "Building2", requiredPermission: "tenant:manage" },
    { id: "admin-modules", label: "Module", path: "/dashboard/modules/admin/modules", iconKey: "Layers", requiredPermission: "modules:manage" },
  ],
};

export const calendarModule: ModuleConfig = {
  key: "calendar",
  name: "Kalender",
  description: "Kalender und Abwesenheiten (Phase 2).",
  iconKey: "Calendar",
  isCore: false,
  permissions: [
    { key: "calendar:read", module: "calendar", resource: "calendar", action: "read", description: "Kalender anzeigen" },
    { key: "calendar:create", module: "calendar", resource: "calendar", action: "create", description: "Kalendereinträge erstellen" },
    { key: "calendar:update", module: "calendar", resource: "calendar", action: "update", description: "Kalendereinträge bearbeiten" },
    { key: "calendar:delete", module: "calendar", resource: "calendar", action: "delete", description: "Kalendereinträge löschen" },
  ],
  menuItems: [
    { id: "calendar-list", label: "Kalender", path: "/dashboard/modules/calendar", iconKey: "Calendar", requiredPermission: "calendar:read" },
  ],
};

export const absencesModule: ModuleConfig = {
  key: "absences",
  name: "Abwesenheiten",
  description: "Urlaub, Krankmeldungen und Abwesenheitsworkflow (Phase 2).",
  iconKey: "Plane",
  isCore: false,
  permissions: [
    { key: "absences:read", module: "absences", resource: "absence", action: "read", description: "Abwesenheiten anzeigen" },
    { key: "absences:create", module: "absences", resource: "absence", action: "create", description: "Abwesenheiten beantragen" },
    { key: "absences:approve", module: "absences", resource: "absence", action: "approve", description: "Abwesenheiten genehmigen" },
    { key: "absences:delete", module: "absences", resource: "absence", action: "delete", description: "Abwesenheiten löschen" },
  ],
  menuItems: [
    { id: "absences-list", label: "Abwesenheiten", path: "/dashboard/modules/absences", iconKey: "Plane", requiredPermission: "absences:read" },
  ],
};

export const vehiclesModule: ModuleConfig = {
  key: "vehicles",
  name: "Fahrzeuge",
  description: "Fahrzeugverwaltung für Einsatzplanung.",
  iconKey: "Truck",
  isCore: false,
  permissions: [
    { key: "vehicles:read", module: "vehicles", resource: "vehicle", action: "read", description: "Fahrzeuge anzeigen" },
    { key: "vehicles:create", module: "vehicles", resource: "vehicle", action: "create", description: "Fahrzeug erstellen" },
    { key: "vehicles:update", module: "vehicles", resource: "vehicle", action: "update", description: "Fahrzeug bearbeiten" },
    { key: "vehicles:delete", module: "vehicles", resource: "vehicle", action: "delete", description: "Fahrzeug löschen" },
  ],
  menuItems: [
    { id: "vehicles-list", label: "Fahrzeuge", path: "/dashboard/modules/vehicles", iconKey: "Truck", requiredPermission: "vehicles:read" },
  ],
};

export const planningModule: ModuleConfig = {
  key: "planning",
  name: "Einsatzplanung",
  description: "Tagesplanung für Baustellen, Mitarbeiter und Fahrzeuge.",
  iconKey: "CalendarDays",
  isCore: false,
  permissions: [
    { key: "planning:read", module: "planning", resource: "dailyPlan", action: "read", description: "Einsatzplanung anzeigen" },
    { key: "planning:create", module: "planning", resource: "dailyPlan", action: "create", description: "Einsatzplanung erstellen" },
    { key: "planning:update", module: "planning", resource: "dailyPlan", action: "update", description: "Einsatzplanung bearbeiten" },
    { key: "planning:delete", module: "planning", resource: "dailyPlan", action: "delete", description: "Einsatzplanung löschen" },
    { key: "planning:export", module: "planning", resource: "dailyPlan", action: "export", description: "Einsatzplanung als PDF exportieren" },
  ],
  menuItems: [
    { id: "planning-today", label: "Einsatzplanung", path: "/dashboard/modules/planning", iconKey: "CalendarDays", requiredPermission: "planning:read" },
  ],
};
