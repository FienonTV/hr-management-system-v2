import { z } from "zod";

export const employmentStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "ONBOARDING",
  "TERMINATED",
]);

export const employmentTypeSchema = z.enum([
  "FULL_TIME",
  "PART_TIME",
  "FREELANCE",
  "INTERN",
  "APPRENTICE",
]);

export const genderSchema = z.enum([
  "MALE",
  "FEMALE",
  "DIVERSE",
  "NOT_SPECIFIED",
]);

export const addressSchema = z.object({
  street: z.string().trim().max(255).optional(),
  zip: z.string().trim().max(20).optional(),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
});

export const sensitiveDataSchema = z.object({
  taxId: z.string().trim().max(255).optional(),
  socialSecurityNumber: z.string().trim().max(255).optional(),
  iban: z.string().trim().max(255).optional(),
  bic: z.string().trim().max(255).optional(),
  emergencyContactName: z.string().trim().max(255).optional(),
  emergencyContactPhone: z.string().trim().max(255).optional(),
});

type DateInput = string | Date | undefined;

const dateTransform = z
  .union([z.string().date(), z.string().datetime(), z.date(), z.undefined()])
  .transform((val) => (typeof val === "string" ? new Date(val) : val));

export const employeeBaseSchema = z.object({
  employeeNumber: z.string().trim().max(100).optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.union([z.string().email().max(255), z.string().length(0), z.null()]).optional(),
  phone: z.union([z.string().trim().max(50), z.string().length(0), z.null()]).optional(),
  positionId: z.union([z.string().trim().max(100), z.string().length(0), z.null()]).optional(),
  departmentId: z.union([z.string().trim().max(100), z.string().length(0), z.null()]).optional(),
  payGradeId: z.union([z.string().trim().max(100), z.string().length(0), z.null()]).optional(),
  employmentType: employmentTypeSchema.nullable().optional(),
  status: employmentStatusSchema.nullable().optional(),
  birthDate: z.union([dateTransform, z.null()]).optional(),
  gender: genderSchema.nullable().optional(),
  startDate: z.union([dateTransform, z.null()]).optional(),
  exitDate: z.union([dateTransform, z.null()]).optional(),
  hourlyWage: z.union([z.coerce.number().min(0), z.null()]).optional(),
  vacationDays: z.union([z.coerce.number().min(0).pipe(z.number().int()), z.null()]).optional(),
  probationEndDate: z.union([dateTransform, z.null()]).optional(),
  fixedTermEndDate: z.union([dateTransform, z.null()]).optional(),
  keyNumber: z.union([z.string().trim().max(100), z.string().length(0), z.null()]).optional(),
  chipNumber: z.union([z.string().trim().max(100), z.string().length(0), z.null()]).optional(),
  driverLicenseClasses: z.union([z.string().trim().max(100), z.string().length(0), z.null()]).optional(),
  forkliftLicense: z.coerce.boolean().nullable().optional(),
  address: addressSchema.nullable().optional(),
  sensitiveData: sensitiveDataSchema.nullable().optional(),
  customFields: z.record(z.string(), z.unknown()).nullable().optional(),
  notes: z.union([z.string().trim().max(2000), z.string().length(0), z.null()]).optional(),
});

export const createEmployeeSchema = employeeBaseSchema.extend({
  createUserAccount: z.boolean().default(false),
  userRoleIds: z.array(z.string()).optional(),
}).transform((data) => ({
  ...data,
  status: data.status ?? undefined,
  gender: data.gender ?? undefined,
}));

export const updateEmployeeSchema = employeeBaseSchema;

export type AddressInput = z.infer<typeof addressSchema>;
export type SensitiveDataInput = z.infer<typeof sensitiveDataSchema>;

// Loose input types for the UI/forms. Server actions parse with Zod and apply defaults.
// UI sends flat fields (street, taxId, ...) which get normalized into address / sensitiveData.
export interface EmployeeBaseInput {
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  positionId?: string;
  departmentId?: string;
  payGradeId?: string;
  employmentType?: z.infer<typeof employmentTypeSchema>;
  status?: z.infer<typeof employmentStatusSchema>;
  birthDate?: DateInput;
  gender?: z.infer<typeof genderSchema>;
  startDate?: DateInput;
  exitDate?: DateInput;
  hourlyWage?: number;
  vacationDays?: number;
  probationEndDate?: DateInput;
  fixedTermEndDate?: DateInput;
  keyNumber?: string;
  chipNumber?: string;
  driverLicenseClasses?: string;
  forkliftLicense?: boolean;
  address?: AddressInput;
  sensitiveData?: SensitiveDataInput;
  customFields?: Record<string, unknown>;
  notes?: string;

  // Flat UI fields (normalized by server action)
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
  taxId?: string;
  socialSecurityNumber?: string;
  iban?: string;
  bic?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface CreateEmployeeInput extends EmployeeBaseInput {
  createUserAccount?: boolean;
  userRoleIds?: string[];
}

export type UpdateEmployeeInput = Partial<EmployeeBaseInput>;

export function parseCreateEmployeeInput(data: CreateEmployeeInput) {
  return createEmployeeSchema.parse(data);
}

export function parseUpdateEmployeeInput(data: UpdateEmployeeInput) {
  return updateEmployeeSchema.parse(data);
}
