'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

const CreateEmployeeUserSchema = z.object({
  employeeId: z.string().min(1),
  email: z.string().email(),
  roleIds: z.array(z.string()).optional(),
});

const UpdateEmployeeUserSchema = z.object({
  employeeId: z.string().min(1),
  roleIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

function generateTempPassword() {
  return Math.random().toString(36).slice(-10);
}

export async function getEmployeeUser(employeeId: string) {
  const { tenantId } = await requirePermission("users:read");
  return withTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id: employeeId },
      include: {
        userAccount: {
          include: {
            roles: {
              include: {
                role: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!employee || employee.tenantId !== tenantId) {
      return { success: false, error: "Mitarbeiter nicht gefunden" };
    }

    const user = employee.userAccount;
    if (!user) {
      return { success: true, user: null };
    }

    return {
      success: true,
      user: {
        ...user,
        roles: user.roles.map((ur) => ur.role),
      },
    };
  });
}

export async function createEmployeeUser(
  data: unknown
): Promise<{ success: boolean; error?: string; user?: { id: string; email: string }; tempPassword?: string }> {
  const { tenantId, session } = await requirePermission("users:update");
  const validated = CreateEmployeeUserSchema.parse(data);

  return withTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id: validated.employeeId },
    });
    if (!employee || employee.tenantId !== tenantId) {
      return { success: false, error: "Mitarbeiter nicht gefunden" };
    }

    const existingUser = await tx.user.findUnique({
      where: { tenantId_email: { tenantId, email: validated.email } },
    });
    if (existingUser) {
      return { success: false, error: "Ein Benutzer mit dieser E-Mail existiert bereits" };
    }

    const existingEmployeeUser = await tx.user.findUnique({
      where: { employeeId: validated.employeeId },
    });
    if (existingEmployeeUser) {
      return { success: false, error: "Dieser Mitarbeiter hat bereits einen Benutzer-Account" };
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await tx.user.create({
      data: {
        tenantId,
        employeeId: employee.id,
        email: validated.email,
        passwordHash,
        firstName: employee.firstName,
        lastName: employee.lastName,
        isActive: true,
        isSystemAdmin: false,
        forcePasswordChange: true,
      },
    });

    if (validated.roleIds && validated.roleIds.length > 0) {
      await tx.userRole.createMany({
        data: validated.roleIds.map((roleId) => ({
          tenantId,
          userId: user.id,
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
      metadata: { email: user.email, employeeId: employee.id, via: "employee.user.create" },
    });

    revalidatePath(`/dashboard/employees/${employee.id}`);
    return { success: true, user: { id: user.id, email: user.email }, tempPassword };
  });
}

export async function updateEmployeeUser(
  data: unknown
): Promise<{ success: boolean; error?: string; user?: { id: string; email: string; isActive: boolean } }> {
  const { tenantId, session } = await requirePermission("users:update");
  const validated = UpdateEmployeeUserSchema.parse(data);

  return withTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id: validated.employeeId },
      include: { userAccount: true },
    });
    if (!employee || employee.tenantId !== tenantId) {
      return { success: false, error: "Mitarbeiter nicht gefunden" };
    }

    const user = employee.userAccount;
    if (!user) {
      return { success: false, error: "Dieser Mitarbeiter hat keinen Benutzer-Account" };
    }

    if (validated.isActive !== undefined) {
      await tx.user.update({
        where: { id: user.id },
        data: { isActive: validated.isActive },
      });
    }

    if (validated.roleIds !== undefined) {
      await tx.userRole.deleteMany({
        where: { tenantId, userId: user.id },
      });
      if (validated.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: validated.roleIds.map((roleId) => ({
            tenantId,
            userId: user.id,
            roleId,
          })),
        });
      }
    }

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "user.update",
      resourceType: "user",
      resourceId: user.id,
      metadata: { email: user.email, employeeId: employee.id },
    });

    revalidatePath(`/dashboard/employees/${employee.id}`);
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        isActive: validated.isActive ?? user.isActive,
      },
    };
  });
}

export async function resetEmployeeUserPassword(
  employeeId: string
): Promise<{ success: boolean; error?: string; tempPassword?: string }> {
  const { tenantId, session } = await requirePermission("users:update");

  return withTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id: employeeId },
      include: { userAccount: true },
    });
    if (!employee || employee.tenantId !== tenantId) {
      return { success: false, error: "Mitarbeiter nicht gefunden" };
    }

    const user = employee.userAccount;
    if (!user) {
      return { success: false, error: "Dieser Mitarbeiter hat keinen Benutzer-Account" };
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, forcePasswordChange: true },
    });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "user.passwordReset",
      resourceType: "user",
      resourceId: user.id,
      metadata: { email: user.email, employeeId: employee.id },
    });

    return { success: true, tempPassword };
  });
}

export async function deleteEmployeeUser(employeeId: string): Promise<{ success: boolean; error?: string }> {
  const { tenantId, session } = await requirePermission("users:update");

  return withTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id: employeeId },
      include: { userAccount: true },
    });
    if (!employee || employee.tenantId !== tenantId) {
      return { success: false, error: "Mitarbeiter nicht gefunden" };
    }

    const user = employee.userAccount;
    if (!user) {
      return { success: false, error: "Dieser Mitarbeiter hat keinen Benutzer-Account" };
    }

    if (user.isSystemAdmin) {
      return { success: false, error: "System-Admin Account kann nicht gelöscht werden" };
    }

    await tx.user.delete({ where: { id: user.id } });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "user.delete",
      resourceType: "user",
      resourceId: user.id,
      metadata: { email: user.email, employeeId: employee.id },
    });

    revalidatePath(`/dashboard/employees/${employee.id}`);
    return { success: true };
  });
}

export async function getAssignableRoles(): Promise<{ id: string; name: string; isAdmin: boolean }[]> {
  const { tenantId } = await requirePermission("users:read");
  return withTenant(tenantId, async (tx) => {
    return tx.role.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, isAdmin: true },
    });
  });
}
