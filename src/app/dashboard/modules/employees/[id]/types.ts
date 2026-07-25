import type { Employee as PrismaEmployee, EmploymentContract as PrismaContract } from "@prisma/client";

export type Employee = Omit<PrismaEmployee, "address" | "sensitiveData"> & {
  address: unknown;
  sensitiveData: unknown;

  // Flattened access helpers used by the form
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
  taxId?: string | null;
  socialSecurityNumber?: string | null;
  iban?: string | null;
  bic?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
};

export type EmploymentContract = PrismaContract;

export type RoleOption = {
  id: string;
  name: string;
  isAdmin: boolean;
};

export type EmployeeUserData = {
  id: string;
  email: string;
  isActive: boolean;
  roles: { id: string; name: string }[];
};
