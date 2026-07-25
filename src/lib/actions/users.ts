'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { User } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const CreateUserSchema = z.object({
  email: z.string().email(),
  employeeId: z.string().min(1),
  roleIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function getUsersWithRoles(): Promise<(User & { roles: { id: string; name: string }[]; employee?: { id: string; firstName: string; lastName: string } | null })[]> {
  const { tenantId } = await requirePermission("users:read");
  return withTenant(tenantId, async (tx) => {
    const users = await tx.user.findMany({
      where: { tenantId },
      orderBy: { email: "asc" },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        roles: {
          include: {
            role: { select: { id: true, name: true } },
          },
        },
      },
    });

    return users.map((user) => ({
      ...user,
      roles: user.roles.map((ur) => ur.role),
    }));
  });
}

export async function createUser(data: unknown): Promise<{ success: boolean; error?: string }> {
  const { tenantId, session } = await requirePermission("users:update");
  const validated = CreateUserSchema.parse(data);

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

    const tempPassword = Math.random().toString(36).slice(-10);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await tx.user.create({
      data: {
        tenantId,
        employeeId: validated.employeeId,
        email: validated.email,
        passwordHash,
        firstName: employee.firstName,
        lastName: employee.lastName,
        isActive: validated.isActive ?? true,
        isSystemAdmin: false,
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
      metadata: { email: user.email, employeeId: employee.id },
    });

    revalidatePath("/dashboard/modules/users");
    return { success: true };
  });
}

export async function deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
  const { tenantId, session } = await requirePermission("users:update");
  return withTenant(tenantId, async (tx) => {
    const user = await tx.user.findUnique({ where: { id } });
    if (!user || user.tenantId !== tenantId) {
      return { success: false, error: "Benutzer nicht gefunden" };
    }
    if (user.isSystemAdmin) {
      return { success: false, error: "System-Admin kann nicht gelöscht werden" };
    }

    await tx.user.delete({ where: { id } });

    await logAudit({
      tenantId,
      userId: session.user.id,
      action: "user.delete",
      resourceType: "user",
      resourceId: id,
      metadata: { email: user.email },
    });

    revalidatePath("/dashboard/modules/users");
    return { success: true };
  });
}
