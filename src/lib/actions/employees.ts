'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from 'next/cache';
import type { Employee, User } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  parseCreateEmployeeInput,
  parseUpdateEmployeeInput,
} from "@/lib/schemas/employees";
import type { EmployeeBaseInput, CreateEmployeeInput, UpdateEmployeeInput } from "@/lib/schemas/employees";
import { logAudit } from "@/lib/audit";
import { hashPassword, generateTemporaryPassword } from "@/lib/passwordPolicy";

function normalizeCreateEmployeeInput(data: CreateEmployeeInput): CreateEmployeeInput {
  return normalizeEmployeeInput(data) as CreateEmployeeInput;
}

function normalizeUpdateEmployeeInput(data: UpdateEmployeeInput): UpdateEmployeeInput {
  return normalizeEmployeeInput(data) as UpdateEmployeeInput;
}

function normalizeEmployeeInput(data: EmployeeBaseInput | Partial<EmployeeBaseInput>): EmployeeBaseInput | Partial<EmployeeBaseInput> {
  const addressFields: (keyof EmployeeBaseInput)[] = ["street", "zip", "city", "country"];
  const sensitiveFields: (keyof EmployeeBaseInput)[] = ["taxId", "socialSecurityNumber", "iban", "bic", "emergencyContactName", "emergencyContactPhone"];

  const base = data as EmployeeBaseInput;

  const hasAddressField = addressFields.some((key) => base[key] !== undefined);
  const hasSensitiveField = sensitiveFields.some((key) => base[key] !== undefined);

  const address = hasAddressField
    ? {
        street: base.street ?? base.address?.street,
        zip: base.zip ?? base.address?.zip,
        city: base.city ?? base.address?.city,
        country: base.country ?? base.address?.country,
      }
    : base.address;

  const sensitiveData = hasSensitiveField
    ? {
        taxId: base.taxId ?? base.sensitiveData?.taxId,
        socialSecurityNumber: base.socialSecurityNumber ?? base.sensitiveData?.socialSecurityNumber,
        iban: base.iban ?? base.sensitiveData?.iban,
        bic: base.bic ?? base.sensitiveData?.bic,
        emergencyContactName: base.emergencyContactName ?? base.sensitiveData?.emergencyContactName,
        emergencyContactPhone: base.emergencyContactPhone ?? base.sensitiveData?.emergencyContactPhone,
      }
    : base.sensitiveData;

  const normalized: EmployeeBaseInput | Partial<EmployeeBaseInput> = { ...data };

  for (const key of addressFields) {
    delete (normalized as Record<string, unknown>)[key as string];
  }
  for (const key of sensitiveFields) {
    delete (normalized as Record<string, unknown>)[key as string];
  }

  if (address) (normalized as EmployeeBaseInput).address = address as EmployeeBaseInput["address"];
  if (sensitiveData) (normalized as EmployeeBaseInput).sensitiveData = sensitiveData as EmployeeBaseInput["sensitiveData"];

  return normalized;
}

export async function getEmployees(search?: string): Promise<(Employee & { userAccount?: User | null })[]> {
  const { tenantId } = await requirePermission("employees:read");
  return withTenant(tenantId, async (tx) => {
    const normalizedSearch = search?.trim();
    const where: Prisma.EmployeeWhereInput = { tenantId };
    if (normalizedSearch) {
      where.OR = [
        { firstName: { contains: normalizedSearch, mode: "insensitive" } },
        { lastName: { contains: normalizedSearch, mode: "insensitive" } },
        { email: { contains: normalizedSearch, mode: "insensitive" } },
        { employeeNumber: { contains: normalizedSearch, mode: "insensitive" } },
        { position: { contains: normalizedSearch, mode: "insensitive" } },
        { department: { contains: normalizedSearch, mode: "insensitive" } },
      ];
    }
    return await tx.employee.findMany({
      where,
      orderBy: { lastName: 'asc' },
      include: { userAccount: true },
    });
  });
}

export async function getEmployeeById(id: string): Promise<(Employee & { userAccount?: User | null }) | null> {
  const { tenantId } = await requirePermission("employees:read");
  return withTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id },
      include: { userAccount: true },
    });
    if (!employee) return null;

    // Flatten JSON address/sensitiveData fields for the UI form.
    const address = employee.address as Record<string, string | null | undefined> | null | undefined;
    const sensitiveData = employee.sensitiveData as Record<string, string | null | undefined> | null | undefined;

    return {
      ...employee,
      street: address?.street ?? null,
      zip: address?.zip ?? null,
      city: address?.city ?? null,
      country: address?.country ?? null,
      taxId: sensitiveData?.taxId ?? null,
      socialSecurityNumber: sensitiveData?.socialSecurityNumber ?? null,
      iban: sensitiveData?.iban ?? null,
      bic: sensitiveData?.bic ?? null,
      emergencyContactName: sensitiveData?.emergencyContactName ?? null,
      emergencyContactPhone: sensitiveData?.emergencyContactPhone ?? null,
    };
  });
}

export async function getEmployeesWithoutUser(): Promise<Employee[]> {
  const { tenantId } = await requirePermission("employees:read");
  return withTenant(tenantId, async (tx) => {
    return await tx.employee.findMany({
      where: {
        tenantId,
        status: { not: "TERMINATED" },
        userAccount: { is: null },
      },
      orderBy: { lastName: 'asc' },
    });
  });
}

export async function createEmployee(data: CreateEmployeeInput): Promise<{ success: boolean; error?: string; employeeId?: string; temporaryPassword?: string }> {
  const { tenantId, session } = await requirePermission("employees:create");
  const normalized = normalizeCreateEmployeeInput(data);
  const validated = parseCreateEmployeeInput(normalized);
  const { createUserAccount, userRoleIds, ...employeeData } = validated;

  return withTenant(tenantId, async (tx) => {
    if (employeeData.email) {
      const existing = await tx.employee.findFirst({
        where: { tenantId, email: employeeData.email },
      });
      if (existing) {
        return { success: false, error: "Ein Mitarbeiter mit dieser E-Mail existiert bereits" };
      }
    }

    if (employeeData.employeeNumber) {
      const numberConflict = await tx.employee.findFirst({
        where: { tenantId, employeeNumber: employeeData.employeeNumber },
      });
      if (numberConflict) {
        return { success: false, error: "Diese Mitarbeiternummer existiert bereits" };
      }
    }

    const employee = await tx.employee.create({
      data: {
        ...employeeData,
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

      temporaryPassword = generateTemporaryPassword();
      const passwordHash = await hashPassword(temporaryPassword);

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
          data: userRoleIds.map((roleId: string) => ({
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
    }

    revalidatePath('/dashboard/modules/employees');

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

export async function updateEmployee(id: string, data: UpdateEmployeeInput): Promise<{ success: boolean; error?: string }> {
  const { tenantId, session } = await requirePermission("employees:update");
  const normalized = normalizeUpdateEmployeeInput(data);
  const validated = parseUpdateEmployeeInput(normalized);

  return withTenant(tenantId, async (tx) => {
    const existing = await tx.employee.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      return { success: false, error: "Mitarbeiter nicht gefunden" };
    }

    if (validated.email && validated.email !== existing.email) {
      const conflict = await tx.employee.findFirst({
        where: { tenantId, email: validated.email, id: { not: id } },
      });
      if (conflict) {
        return { success: false, error: "Ein Mitarbeiter mit dieser E-Mail existiert bereits" };
      }
    }

    if (validated.employeeNumber && validated.employeeNumber !== existing.employeeNumber) {
      const numberConflict = await tx.employee.findFirst({
        where: { tenantId, employeeNumber: validated.employeeNumber, id: { not: id } },
      });
      if (numberConflict) {
        return { success: false, error: "Diese Mitarbeiternummer existiert bereits" };
      }
    }

    const employee = await tx.employee.update({
      where: { id },
      data: validated,
    });

    revalidatePath('/dashboard/modules/employees');
    revalidatePath(`/dashboard/modules/employees/${id}`);

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
    revalidatePath('/dashboard/modules/employees');

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
