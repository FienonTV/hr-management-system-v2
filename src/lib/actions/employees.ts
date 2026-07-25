'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from 'next/cache';
import { Employee, User } from "@prisma/client";
import { EmployeeSchema } from "@/lib/schemas/employees";
import type { EmployeeInput } from "@/lib/schemas/employees";
import { logAudit } from "@/lib/audit";
import bcrypt from 'bcryptjs';

export async function getEmployees(): Promise<(Employee & { userAccount?: User | null })[]> {
  const { tenantId } = await requirePermission("employees:read");
  return withTenant(tenantId, async (tx) => {
    return await tx.employee.findMany({
      where: { tenantId },
      orderBy: { lastName: 'asc' },
      include: { userAccount: true },
    });
  });
}

export async function getEmployeeById(id: string): Promise<(Employee & { userAccount?: User | null }) | null> {
  const { tenantId } = await requirePermission("employees:read");
  return withTenant(tenantId, async (tx) => {
    return await tx.employee.findUnique({
      where: { id },
      include: { userAccount: true },
    });
  });
}

export async function getEmployeesWithoutUser(): Promise<Employee[]> {
  const { tenantId } = await requirePermission("employees:read");
  return withTenant(tenantId, async (tx) => {
    return await tx.employee.findMany({
      where: {
        tenantId,
        userAccount: { is: null },
      },
      orderBy: { lastName: 'asc' },
    });
  });
}

export async function createEmployee(data: EmployeeInput): Promise<{ success: boolean; error?: string; employeeId?: string; temporaryPassword?: string }> {
  const { tenantId, session } = await requirePermission("employees:create");
  const validated = EmployeeSchema.parse(data);
  const { startDate, createUserAccount, userRoleIds, ...employeeData } = validated;

  return withTenant(tenantId, async (tx) => {
    if (employeeData.email) {
      const existing = await tx.employee.findFirst({
        where: { tenantId, email: employeeData.email },
      });
      if (existing) {
        return { success: false, error: "Ein Mitarbeiter mit dieser E-Mail existiert bereits" };
      }
    }

    const employee = await tx.employee.create({
      data: {
        ...employeeData,
        startDate: startDate ? new Date(startDate) : null,
        tenantId,
      },
    });

    let user: User | null = null;
    let temporaryPassword: string | undefined;
    if (createUserAccount && employeeData.email) {
      const existingUser = await tx.user.findUnique({
        where: { tenantId_email: { tenantId, email: employeeData.email } },
      });
      if (existingUser) {
        return { success: false, error: "Ein Benutzer mit dieser E-Mail existiert bereits" };
      }

      temporaryPassword = Math.random().toString(36).slice(-10);
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);

      user = await tx.user.create({
        data: {
          tenantId,
          employeeId: employee.id,
          email: employeeData.email,
          passwordHash,
          firstName: employee.firstName,
          lastName: employee.lastName,
          isActive: true,
          isSystemAdmin: false,
          forcePasswordChange: true,
        },
      });

      if (userRoleIds && userRoleIds.length > 0) {
        await tx.userRole.createMany({
          data: userRoleIds.map((roleId) => ({
            tenantId,
            userId: user!.id,
            roleId,
          })),
        });
      }

      await logAudit({
        tenantId,
        userId: session.user.id,
        action: "user.create",
        resourceType: "user",
        resourceId: user.id,
        metadata: { email: user.email, employeeId: employee.id, via: "employee.create" },
      });

      // Passwort-Reset/Welcome-E-Mail wird später implementiert; bis dahin gilt das temporäre Passwort.
    }

    revalidatePath('/dashboard/employees');

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "employee.create",
      resourceType: "employee",
      resourceId: employee.id,
      metadata: { firstName: employee.firstName, lastName: employee.lastName, createdUser: !!user },
    });

    return { success: true, employeeId: employee.id, temporaryPassword };
  });
}

export async function updateEmployee(id: string, data: EmployeeInput): Promise<{ success: boolean; error?: string }> {
  const { tenantId, session } = await requirePermission("employees:update");
  const validated = EmployeeSchema.parse(data);
  const { startDate, createUserAccount, userRoleIds, ...employeeData } = validated;
  void createUserAccount;
  void userRoleIds;

  return withTenant(tenantId, async (tx) => {
    const existing = await tx.employee.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      return { success: false, error: "Mitarbeiter nicht gefunden" };
    }

    if (employeeData.email && employeeData.email !== existing.email) {
      const conflict = await tx.employee.findFirst({
        where: { tenantId, email: employeeData.email, id: { not: id } },
      });
      if (conflict) {
        return { success: false, error: "Ein Mitarbeiter mit dieser E-Mail existiert bereits" };
      }
    }

    const employee = await tx.employee.update({
      where: { id },
      data: {
        ...employeeData,
        startDate: startDate ? new Date(startDate) : null,
      },
    });

    revalidatePath('/dashboard/employees');
    revalidatePath(`/dashboard/employees/${id}`);

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "employee.update",
      resourceType: "employee",
      resourceId: id,
      metadata: { firstName: employee.firstName, lastName: employee.lastName },
    });

    return { success: true };
  });
}

export async function deleteEmployee(id: string): Promise<{ success: boolean; error?: string }> {
  const { tenantId, session } = await requirePermission("employees:delete");
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.employee.findUnique({
      where: { id },
      include: { userAccount: true },
    });
    if (!existing || existing.tenantId !== tenantId) {
      return { success: false, error: "Mitarbeiter nicht gefunden" };
    }
    if (existing.userAccount) {
      return { success: false, error: "Mitarbeiter hat einen Benutzer-Account und kann nicht gelöscht werden" };
    }

    await tx.employee.delete({
      where: { id },
    });
    revalidatePath('/dashboard/employees');

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "employee.delete",
      resourceType: "employee",
      resourceId: id,
    });

    return { success: true };
  });
}
