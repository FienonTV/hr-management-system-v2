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
  email: z.string().email().max(255).optional(),
  phone: z.string().trim().max(50).optional(),
  position: z.string().trim().max(100).optional(),
  department: z.string().trim().max(100).optional(),
  employmentType: employmentTypeSchema.optional(),
  status: employmentStatusSchema.optional(),
  birthDate: dateTransform,
  gender: genderSchema.optional(),
  startDate: dateTransform,
  exitDate: dateTransform,
  address: addressSchema.optional(),
  sensitiveData: sensitiveDataSchema.optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const createEmployeeSchema = employeeBaseSchema.extend({
  createUserAccount: z.boolean().default(false),
  userRoleIds: z.array(z.string()).optional(),
}).transform((data) => ({
  ...data,
  status: data.status ?? "ACTIVE",
  gender: data.gender ?? "NOT_SPECIFIED",
}));

export const updateEmployeeSchema = employeeBaseSchema;

export const employmentContractSchema = z.object({
  title: z.string().trim().min(1).max(255),
  contractType: z.enum(["PERMANENT", "FIXED_TERM", "MINIJOB", "WORKER"]),
  startDate: z.union([z.string(), z.date()]).transform((v) => new Date(v)),
  endDate: z.union([z.string(), z.date()]).optional().transform((v) => (v ? new Date(v) : undefined)),
  weeklyHours: z.coerce.number().min(0).max(168).optional(),
  salaryJson: z.string().max(5000).optional(),
  notes: z.string().trim().max(2000).optional(),
});

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
  position?: string;
  department?: string;
  employmentType?: z.infer<typeof employmentTypeSchema>;
  status?: z.infer<typeof employmentStatusSchema>;
  birthDate?: DateInput;
  gender?: z.infer<typeof genderSchema>;
  startDate?: DateInput;
  exitDate?: DateInput;
  address?: AddressInput;
  sensitiveData?: SensitiveDataInput;
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

export type EmploymentContractInput = z.infer<typeof employmentContractSchema>;

export function parseCreateEmployeeInput(data: CreateEmployeeInput) {
  return createEmployeeSchema.parse(data);
}

export function parseUpdateEmployeeInput(data: UpdateEmployeeInput) {
  return updateEmployeeSchema.parse(data);
}
