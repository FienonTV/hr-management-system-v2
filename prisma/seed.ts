import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from 'bcryptjs';

async function main() {
  // Seed uses the unrestricted admin DB user (DIRECT_URL) so it can create
  // tenant-scoped rows without needing an RLS tenant context.
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DIRECT_URL or DATABASE_URL must be set");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Schendel GmbH',
      slug: 'default',
      externalId: 'default',
    },
  });

  const hashedPassword = await bcrypt.hash('admin123', 12);

  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@example.com',
      },
    },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: hashedPassword,
      isSystemAdmin: true,
      tenantId: tenant.id,
    },
  });

  // Upsert module definitions based on registered modules
  const moduleDefinitions = [
    { key: 'employees', name: 'Mitarbeiter', description: 'Verwaltung aller Mitarbeiter-Stammdaten, Dokumente und Qualifikationen.', isCore: true },
    { key: 'roles', name: 'Rollen', description: 'Rollen und Berechtigungen verwalten.', isCore: true },
    { key: 'users', name: 'Benutzer', description: 'Benutzer-Accounts und Einladungen verwalten.', isCore: true },
    { key: 'audit', name: 'Audit-Log', description: 'Sicherheitsrelevante Ereignisse einsehen.', isCore: true },
    { key: 'files', name: 'Dateien', description: 'Dateien und Dokumente verwalten.', isCore: true },
    { key: 'admin', name: 'Administration', description: 'Firmen-Einstellungen und Module verwalten.', isCore: true },
    { key: 'projects', name: 'Projekte', description: 'Projekte und Baustellen verwalten.', isCore: false },
    { key: 'time-tracking', name: 'Zeiterfassung', description: 'Zeiterfassung für Mitarbeiter.', isCore: false },
    { key: 'payroll', name: 'Lohnabrechnung', description: 'Lohnabrechnungs-CSV-Export.', isCore: false },
    { key: 'calendar', name: 'Kalender', description: 'Kalender und Termine.', isCore: false },
    { key: 'absences', name: 'Abwesenheiten', description: 'Urlaub, Krankmeldungen und Abwesenheitsworkflow.', isCore: false },
    { key: 'vehicles', name: 'Fahrzeuge', description: 'Fahrzeugverwaltung für Einsatzplanung.', isCore: false },
    { key: 'planning', name: 'Einsatzplanung', description: 'Tagesplanung für Baustellen, Mitarbeiter und Fahrzeuge.', isCore: false },
    { key: 'woocommerce', name: 'WooCommerce', description: 'WooCommerce Bestell- und Auftragsimport.', isCore: false },
  ];

  await Promise.all(
    moduleDefinitions.map((def) =>
      prisma.moduleDefinition.upsert({
        where: { key: def.key },
        update: {},
        create: def,
      })
    )
  );

  // Upsert default permissions
  const permissionDefinitions = [
    { key: 'employees:read', module: 'employees', resource: 'employee', action: 'read', description: 'Mitarbeiter anzeigen' },
    { key: 'employees:create', module: 'employees', resource: 'employee', action: 'create', description: 'Mitarbeiter erstellen' },
    { key: 'employees:update', module: 'employees', resource: 'employee', action: 'update', description: 'Mitarbeiter bearbeiten' },
    { key: 'employees:delete', module: 'employees', resource: 'employee', action: 'delete', description: 'Mitarbeiter löschen' },
    { key: 'employees:invite', module: 'employees', resource: 'employee', action: 'invite', description: 'Mitarbeiter einladen' },
    { key: 'employees:export', module: 'employees', resource: 'employee', action: 'export', description: 'Mitarbeiter als CSV exportieren' },
    { key: 'roles:read', module: 'roles', resource: 'role', action: 'read', description: 'Rollen anzeigen' },
    { key: 'roles:create', module: 'roles', resource: 'role', action: 'create', description: 'Rollen erstellen' },
    { key: 'roles:update', module: 'roles', resource: 'role', action: 'update', description: 'Rollen bearbeiten' },
    { key: 'roles:delete', module: 'roles', resource: 'role', action: 'delete', description: 'Rollen löschen' },
    { key: 'audit:read', module: 'audit', resource: 'auditLog', action: 'read', description: 'Audit-Log anzeigen' },
    { key: 'files:read', module: 'files', resource: 'file', action: 'read', description: 'Dateien anzeigen' },
    { key: 'files:create', module: 'files', resource: 'file', action: 'create', description: 'Dateien hochladen' },
    { key: 'files:delete', module: 'files', resource: 'file', action: 'delete', description: 'Dateien löschen' },
    { key: 'files:manage', module: 'files', resource: 'file', action: 'manage', description: 'Alle Dateien verwalten' },
    { key: 'documents:read', module: 'documents', resource: 'document', action: 'read', description: 'Dokumente anzeigen' },
    { key: 'documents:create', module: 'documents', resource: 'document', action: 'create', description: 'Dokumente erstellen' },
    { key: 'documents:update', module: 'documents', resource: 'document', action: 'update', description: 'Dokumente bearbeiten' },
    { key: 'documents:delete', module: 'documents', resource: 'document', action: 'delete', description: 'Dokumente löschen' },
    { key: 'documentCategories:manage', module: 'documents', resource: 'documentCategory', action: 'manage', description: 'Dokumentenkategorien verwalten' },
    { key: 'documentTemplates:manage', module: 'documents', resource: 'documentTemplate', action: 'manage', description: 'Dokumentenvorlagen verwalten' },
    { key: 'documents:generate', module: 'documents', resource: 'document', action: 'generate', description: 'Dokumente aus Vorlagen generieren' },
    { key: 'settings:read', module: 'settings', resource: 'tenantSetting', action: 'read', description: 'Einstellungen anzeigen' },
    { key: 'settings:update', module: 'settings', resource: 'tenantSetting', action: 'update', description: 'Einstellungen bearbeiten' },
    { key: 'tenant:manage', module: 'admin', resource: 'tenant', action: 'manage', description: 'Firmen-Einstellungen verwalten' },
    { key: 'modules:manage', module: 'modules', resource: 'module', action: 'manage', description: 'Module verwalten' },
    { key: 'departments:manage', module: 'employees', resource: 'department', action: 'manage', description: 'Abteilungen verwalten' },
    { key: 'positions:manage', module: 'employees', resource: 'position', action: 'manage', description: 'Positionen verwalten' },
    { key: 'payGrades:manage', module: 'employees', resource: 'payGrade', action: 'manage', description: 'Entgeltgruppen verwalten' },
    { key: 'customFields:manage', module: 'employees', resource: 'customFieldDefinition', action: 'manage', description: 'Benutzerdefinierte Felder verwalten' },
    { key: 'qualifications:manage', module: 'employees', resource: 'qualification', action: 'manage', description: 'Qualifikationen verwalten' },
    { key: 'calendar:read', module: 'calendar', resource: 'calendar', action: 'read', description: 'Kalender anzeigen' },
    { key: 'calendar:create', module: 'calendar', resource: 'calendar', action: 'create', description: 'Kalendereinträge erstellen' },
    { key: 'calendar:update', module: 'calendar', resource: 'calendar', action: 'update', description: 'Kalendereinträge bearbeiten' },
    { key: 'calendar:delete', module: 'calendar', resource: 'calendar', action: 'delete', description: 'Kalendereinträge löschen' },
    { key: 'vehicles:read', module: 'vehicles', resource: 'vehicle', action: 'read', description: 'Fahrzeuge anzeigen' },
    { key: 'vehicles:create', module: 'vehicles', resource: 'vehicle', action: 'create', description: 'Fahrzeug erstellen' },
    { key: 'vehicles:update', module: 'vehicles', resource: 'vehicle', action: 'update', description: 'Fahrzeug bearbeiten' },
    { key: 'vehicles:delete', module: 'vehicles', resource: 'vehicle', action: 'delete', description: 'Fahrzeug löschen' },
    { key: 'planning:read', module: 'planning', resource: 'dailyPlan', action: 'read', description: 'Einsatzplanung anzeigen' },
    { key: 'planning:create', module: 'planning', resource: 'dailyPlan', action: 'create', description: 'Einsatzplanung erstellen' },
    { key: 'planning:update', module: 'planning', resource: 'dailyPlan', action: 'update', description: 'Einsatzplanung bearbeiten' },
    { key: 'planning:delete', module: 'planning', resource: 'dailyPlan', action: 'delete', description: 'Einsatzplanung löschen' },
    { key: 'planning:export', module: 'planning', resource: 'dailyPlan', action: 'export', description: 'Einsatzplanung als PDF exportieren' },
    { key: 'absences:read', module: 'absences', resource: 'absence', action: 'read', description: 'Abwesenheiten anzeigen' },
    { key: 'absences:create', module: 'absences', resource: 'absence', action: 'create', description: 'Abwesenheiten beantragen' },
    { key: 'absences:approve', module: 'absences', resource: 'absence', action: 'approve', description: 'Abwesenheiten genehmigen' },
    { key: 'absences:delete', module: 'absences', resource: 'absence', action: 'delete', description: 'Abwesenheiten löschen' },
    { key: 'projects:read', module: 'projects', resource: 'project', action: 'read', description: 'Projekte anzeigen' },
    { key: 'projects:create', module: 'projects', resource: 'project', action: 'create', description: 'Projekte erstellen' },
    { key: 'projects:update', module: 'projects', resource: 'project', action: 'update', description: 'Projekte bearbeiten' },
    { key: 'projects:delete', module: 'projects', resource: 'project', action: 'delete', description: 'Projekte löschen' },
    { key: 'timeTracking:read', module: 'time-tracking', resource: 'timeEntry', action: 'read', description: 'Zeiterfassung anzeigen' },
    { key: 'timeTracking:create', module: 'time-tracking', resource: 'timeEntry', action: 'create', description: 'Zeiterfassung erfassen' },
    { key: 'timeTracking:approve', module: 'time-tracking', resource: 'timeEntry', action: 'approve', description: 'Zeiterfassung genehmigen' },
    { key: 'timeTracking:delete', module: 'time-tracking', resource: 'timeEntry', action: 'delete', description: 'Zeiterfassung löschen' },
    { key: 'timeTracking:export', module: 'time-tracking', resource: 'timeEntry', action: 'export', description: 'Zeiterfassung exportieren' },
    { key: 'payroll:read', module: 'payroll', resource: 'payrollExport', action: 'read', description: 'Lohnabrechnung anzeigen' },
    { key: 'woocommerce:read', module: 'woocommerce', resource: 'woocommerceOrder', action: 'read', description: 'WooCommerce-Bestellungen anzeigen' },
    { key: 'woocommerce:manage', module: 'woocommerce', resource: 'woocommerceSetting', action: 'manage', description: 'WooCommerce-Einstellungen verwalten' },
    { key: 'email:manage', module: 'email', resource: 'emailSetting', action: 'manage', description: 'E-Mail-Einstellungen verwalten' },
  ];

  const permissions = await Promise.all(
    permissionDefinitions.map((def) =>
      prisma.permission.upsert({
        where: { key: def.key },
        update: {},
        create: def,
      })
    )
  );

  // Create the default Admin role for the tenant
  const adminRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: 'Admin',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Admin',
      isAdmin: true,
    },
  });

  // Grant all permissions to the Admin role
  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          tenantId_roleId_permissionId: {
            tenantId: tenant.id,
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      })
    )
  );

  // Activate all non-core modules for the default tenant
  const nonCoreModules = await prisma.moduleDefinition.findMany({ where: { isCore: false } });
  await Promise.all(
    nonCoreModules.map((moduleDef) =>
      prisma.tenantModule.upsert({
        where: {
          tenantId_moduleId: { tenantId: tenant.id, moduleId: moduleDef.id },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          moduleId: moduleDef.id,
          isActive: true,
        },
      })
    )
  );

  // Seed default qualifications
  const qualificationDefinitions = [
    { name: 'Führerschein Klasse B', issuer: '', description: 'PKW-Führerschein', validityInMonths: null },
    { name: 'Staplerschein', issuer: '', description: 'Gabelstapler-Führerschein', validityInMonths: null },
    { name: 'SCC', issuer: '', description: 'Sicherheitszertifikat für Baustellen', validityInMonths: 36 },
    { name: 'Erste-Hilfe', issuer: '', description: 'Erste-Hilfe-Ausbildung', validityInMonths: 24 },
  ];

  await Promise.all(
    qualificationDefinitions.map((def) =>
      prisma.qualification.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: def.name } },
        update: {},
        create: { ...def, tenantId: tenant.id },
      })
    )
  );

  // Assign Admin role to the user
  const adminUser = await prisma.user.findUnique({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@example.com',
      },
    },
  });

  await prisma.userRole.upsert({
    where: {
      tenantId_userId_roleId: {
        tenantId: tenant.id,
        userId: adminUser!.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: adminUser!.id,
      roleId: adminRole.id,
    },
  });

  console.log('Seed completed successfully');
  await prisma.$disconnect();
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  });
