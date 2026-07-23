'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from 'next/cache';
import { Employee } from "@prisma/client";
import { EmployeeSchema } from "@/lib/schemas/employees";
import type { EmployeeInput } from "@/lib/schemas/employees";

export async function getEmployees(): Promise<Employee[]> {
  const { tenantId } = await requirePermission("employees:read");
  return withTenant(tenantId, async (tx) => {
    return await tx.employee.findMany({
      where: { tenantId },
      orderBy: { lastName: 'asc' },
    });
  });
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const { tenantId } = await requirePermission("employees:read");
  return withTenant(tenantId, async (tx) => {
    return await tx.employee.findUnique({
      where: { id },
    });
  });
}

export async function createEmployee(data: EmployeeInput): Promise<{ success: boolean }> {
  const { tenantId } = await requirePermission("employees:create");
  const validated = EmployeeSchema.parse(data);
  const { startDate, ...employeeData } = validated;

  return withTenant(tenantId, async (tx) => {
    await tx.employee.create({
      data: {
        ...employeeData,
        startDate: startDate ? new Date(startDate) : null,
        tenantId,
      },
    });
    revalidatePath('/dashboard/employees');
    return { success: true };
  });
}

export async function updateEmployee(id: string, data: EmployeeInput): Promise<{ success: boolean }> {
  const { tenantId } = await requirePermission("employees:update");
  const validated = EmployeeSchema.parse(data);
  const { startDate, ...employeeData } = validated;

  return withTenant(tenantId, async (tx) => {
    await tx.employee.update({
      where: { id },
      data: {
        ...employeeData,
        startDate: startDate ? new Date(startDate) : null,
      },
    });
    revalidatePath('/dashboard/employees');
    revalidatePath(`/dashboard/employees/${id}`);
    return { success: true };
  });
}

export async function deleteEmployee(id: string): Promise<{ success: boolean }> {
  const { tenantId } = await requirePermission("employees:delete");
  return withTenant(tenantId, async (tx) => {
    await tx.employee.delete({
      where: { id },
    });
    revalidatePath('/dashboard/employees');
    return { success: true };
  });
}
