import type { Employee as PrismaEmployee, EmploymentContract as PrismaContract, File as PrismaFile, User, DocumentContainer as PrismaDocumentContainer, DocumentCategory as PrismaDocumentCategory } from "@prisma/client";

export type Employee = Omit<PrismaEmployee, "address" | "sensitiveData"> & {
  address: unknown;
  sensitiveData: unknown;
  userAccount?: { id: string; email: string } | null;
  // server flattens address/sensitiveData JSON for the form
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

export type FileItem = PrismaFile;

export type DocumentContainer = PrismaDocumentContainer & {
  files: PrismaFile[];
  categories?: PrismaDocumentCategory[];
  uploadedBy?: { firstName: string | null; lastName: string | null; email: string } | null;
};

export type DocumentCategory = PrismaDocumentCategory;

export type RoleOption = { id: string; name: string };

export type EmployeeUserData = Pick<User, "id" | "tenantId" | "employeeId" | "email" | "isActive" | "createdAt" | "updatedAt" | "lastLoginAt"> & {
  firstName: string | null;
  lastName: string | null;
  roles: RoleOption[];
  roleIds: string[];
};

export type FormState = {
  error?: string;
  success?: string;
};

export type ContractFormData = {
  title: string;
  contractType: PrismaContract["contractType"];
  startDate: string;
  endDate?: string;
  salaryJson?: string;
  metadata?: string;
};
