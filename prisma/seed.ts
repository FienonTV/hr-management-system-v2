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

  // Upsert default permissions
  const permissionDefinitions = [
    { key: 'employees:read', module: 'employees', resource: 'employee', action: 'read', description: 'Mitarbeiter anzeigen' },
    { key: 'employees:create', module: 'employees', resource: 'employee', action: 'create', description: 'Mitarbeiter erstellen' },
    { key: 'employees:update', module: 'employees', resource: 'employee', action: 'update', description: 'Mitarbeiter bearbeiten' },
    { key: 'employees:delete', module: 'employees', resource: 'employee', action: 'delete', description: 'Mitarbeiter löschen' },
    { key: 'roles:read', module: 'roles', resource: 'role', action: 'read', description: 'Rollen anzeigen' },
    { key: 'roles:create', module: 'roles', resource: 'role', action: 'create', description: 'Rollen erstellen' },
    { key: 'roles:update', module: 'roles', resource: 'role', action: 'update', description: 'Rollen bearbeiten' },
    { key: 'roles:delete', module: 'roles', resource: 'role', action: 'delete', description: 'Rollen löschen' },
    { key: 'audit:read', module: 'audit', resource: 'auditLog', action: 'read', description: 'Audit-Log anzeigen' },
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
