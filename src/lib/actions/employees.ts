'use server';

import { withTenant } from "@/lib/db/tenant";
import { requirePermission, getEffectivePermissions } from "@/lib/permissions";
import { revalidatePath } from 'next/cache';
import type { Employee, User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  parseCreateEmployeeInput,
  parseUpdateEmployeeInput,
} from "@/lib/schemas/employees";
import type { EmployeeBaseInput, CreateEmployeeInput, UpdateEmployeeInput } from "@/lib/schemas/employees";
import { logAudit } from "@/lib/audit";
import { hashPassword, generateTemporaryPassword } from "@/lib/passwordPolicy";
import { getCustomFieldDefinitions } from "@/lib/actions/employeeCatalogs";

function cleanEmployeeDataForPrisma(data: Record<string, unknown>): any {
  const cleaned = { ...data };
  for (const key of ["positionId", "departmentId", "payGradeId", "email", "phone", "employeeNumber", "keyNumber", "chipNumber", "driverLicenseClasses", "notes"]) {
    if (cleaned[key] === null) delete cleaned[key];
  }
  for (const key of ["address", "sensitiveData", "customFields"]) {
    if (cleaned[key] === null || (typeof cleaned[key] === "object" && cleaned[key] !== null && Object.keys(cleaned[key] as object).length === 0)) {
      delete cleaned[key];
    }
  }
  if (cleaned["forkliftLicense"] === null) cleaned["forkliftLicense"] = false;
  return cleaned;
}

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

function extractCustomFields(input: Record<string, unknown>, definitions: { key: string; fieldType: string }[]) {
  const result: Record<string, unknown> = {};
  for (const def of definitions) {
    if (input[`custom_${def.key}`] !== undefined) {
      result[def.key] = input[`custom_${def.key}`];
    }
  }
  return result;
}

function parseCustomFieldValue(def: { fieldType: string; key: string; options: unknown; name: string }, value: unknown): unknown {
  if (value === undefined || value === null || value === "") return null;
  switch (def.fieldType) {
    case "TEXT":
      return String(value).trim();
    case "NUMBER": {
      const n = Number(value);
      if (isNaN(n)) throw new Error(`Ungültige Zahl für ${def.name}`);
      return n;
    }
    case "DATE": {
      const date = new Date(String(value));
      if (isNaN(date.getTime())) throw new Error(`Ungültiges Datum für ${def.name}`);
      return date.toISOString();
    }
    case "BOOLEAN":
      return value === true || value === "true" || value === "on";
    case "SELECT":
      return String(value).trim();
    case "MULTI_SELECT": {
      if (!Array.isArray(value)) throw new Error(`Ungültiger Wert für ${def.name}`);
      return value.map(String);
    }
    default:
      return value;
  }
}

function validateCustomFields(input: Record<string, unknown>, definitions: { key: string; fieldType: string; name: string; isRequired: boolean; options: unknown }[]) {
  const result: Record<string, unknown> = {};
  for (const def of definitions) {
    const raw = input[def.key];
    if ((raw === undefined || raw === null || raw === "") && def.isRequired) {
      throw new Error(`Feld ${def.name} ist erforderlich`);
    }
    const parsed = parseCustomFieldValue(def, raw);
    if (parsed !== null && parsed !== undefined) {
      const options = def.options as { values?: string[] } | null | undefined;
      if (def.fieldType === "SELECT" && options?.values?.length && !options.values.includes(String(parsed))) {
        throw new Error(`Ungültiger Wert für ${def.name}`);
      }
      if (def.fieldType === "MULTI_SELECT" && options?.values?.length && Array.isArray(parsed)) {
        for (const v of parsed) {
          if (!options.values.includes(String(v))) throw new Error(`Ungültiger Wert für ${def.name}`);
        }
      }
      result[def.key] = parsed;
    }
  }
  return result;
}

export async function getEmployees(search?: string): Promise<(Omit<Employee, "hourlyWage"> & { hourlyWage?: number | null; userAccount?: User | null; position?: { name: string } | null; department?: { name: string } | null })[]> {
  const { tenantId, session } = await requirePermission("employees:read:own");
  const permissions = await getEffectivePermissions(session.user.id, tenantId);
  const canReadAll = permissions.has("employees:read") || permissions.has("employees:read:all");
  return withTenant(tenantId, async (tx) => {
    const normalizedSearch = search?.trim();
    const where: Prisma.EmployeeWhereInput = { tenantId };

    if (!canReadAll) {
      // Own only: find employee record whose linked user account is the current user
      where.userAccount = { id: session.user.id };
    }

    if (normalizedSearch) {
      where.OR = [
        { firstName: { contains: normalizedSearch, mode: "insensitive" } },
        { lastName: { contains: normalizedSearch, mode: "insensitive" } },
        { email: { contains: normalizedSearch, mode: "insensitive" } },
        { employeeNumber: { contains: normalizedSearch, mode: "insensitive" } },
        { position: { name: { contains: normalizedSearch, mode: "insensitive" } } },
        { department: { name: { contains: normalizedSearch, mode: "insensitive" } } },
      ];
    }
    return await tx.employee.findMany({
      where,
      orderBy: { lastName: 'asc' },
      include: { userAccount: true, position: { select: { id: true, name: true } }, department: { select: { id: true, name: true } } },
    }).then((employees) =>
      employees.map((employee) => ({
        ...employee,
        hourlyWage: employee.hourlyWage ? Number(employee.hourlyWage) : null,
      }))
    );
  });
}

export async function getEmployeeById(id: string): Promise<(Employee & { userAccount?: User | null; position?: { name: string; id: string } | null; department?: { name: string; id: string } | null; payGrade?: { name: string; id: string } | null; customFields?: Prisma.JsonValue | null }) | null> {
  const { tenantId, session } = await requirePermission("employees:read:own");
  const permissions = await getEffectivePermissions(session.user.id, tenantId);
  const canReadAll = permissions.has("employees:read") || permissions.has("employees:read:all");
  const canReadPublic = canReadAll || permissions.has("employees:read:public");
  const canReadPersonal = canReadAll || permissions.has("employees:read:personal");
  const canReadContract = canReadAll || permissions.has("employees:read:contract");
  const canReadHrConfidential = canReadAll || permissions.has("employees:read:hr_confidential");

  return withTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findFirst({
      where: {
        id,
        tenantId,
        ...(canReadAll ? {} : { userId: session.user.id }),
      },
      include: { userAccount: true, position: { select: { name: true, id: true } }, department: { select: { name: true, id: true } }, payGrade: { select: { name: true, id: true } } },
    });
    if (!employee) return null;

    const address = employee.address as Record<string, string | null | undefined> | null | undefined;
    const sensitiveData = employee.sensitiveData as Record<string, string | null | undefined> | null | undefined;

    return {
      id: employee.id,
      tenantId: employee.tenantId,
      firstName: canReadPublic ? employee.firstName : null,
      lastName: canReadPublic ? employee.lastName : null,
      email: canReadPublic ? employee.email : null,
      phone: canReadPublic ? employee.phone : null,
      departmentId: canReadPublic ? employee.departmentId : null,
      positionId: canReadPublic ? employee.positionId : null,
      employmentType: canReadPublic ? employee.employmentType : null,
      status: canReadPublic ? employee.status : null,
      birthDate: canReadPersonal ? employee.birthDate : null,
      gender: canReadPersonal ? employee.gender : null,
      address: canReadPersonal ? employee.address : null,
      notes: canReadPersonal ? employee.notes : null,
      street: canReadPersonal ? address?.street ?? null : null,
      zip: canReadPersonal ? address?.zip ?? null : null,
      city: canReadPersonal ? address?.city ?? null : null,
      country: canReadPersonal ? address?.country ?? null : null,
      employeeNumber: canReadContract ? employee.employeeNumber : null,
      startDate: canReadContract ? employee.startDate : null,
      exitDate: canReadContract ? employee.exitDate : null,
      hourlyWage: canReadContract ? (employee.hourlyWage ? Number(employee.hourlyWage) : null) : null,
      vacationDays: canReadContract ? employee.vacationDays : null,
      probationEndDate: canReadContract ? employee.probationEndDate : null,
      fixedTermEndDate: canReadContract ? employee.fixedTermEndDate : null,
      payGradeId: canReadContract ? employee.payGradeId : null,
      keyNumber: canReadHrConfidential ? employee.keyNumber : null,
      chipNumber: canReadHrConfidential ? employee.chipNumber : null,
      driverLicenseClasses: canReadHrConfidential ? employee.driverLicenseClasses : null,
      forkliftLicense: canReadHrConfidential ? employee.forkliftLicense : null,
      sensitiveData: canReadHrConfidential ? employee.sensitiveData : null,
      taxId: canReadHrConfidential ? sensitiveData?.taxId ?? null : null,
      socialSecurityNumber: canReadHrConfidential ? sensitiveData?.socialSecurityNumber ?? null : null,
      iban: canReadHrConfidential ? sensitiveData?.iban ?? null : null,
      bic: canReadHrConfidential ? sensitiveData?.bic ?? null : null,
      emergencyContactName: canReadHrConfidential ? sensitiveData?.emergencyContactName ?? null : null,
      emergencyContactPhone: canReadHrConfidential ? sensitiveData?.emergencyContactPhone ?? null : null,
      customFields: canReadHrConfidential ? employee.customFields : null,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
      userAccount: canReadPublic ? employee.userAccount : null,
      position: canReadPublic ? employee.position : null,
      department: canReadPublic ? employee.department : null,
      payGrade: canReadContract ? employee.payGrade : null,
    } as unknown as Employee & { userAccount?: User | null; position?: { name: string; id: string } | null; department?: { name: string; id: string } | null; payGrade?: { name: string; id: string } | null; customFields?: Prisma.JsonValue | null };
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
  const { createUserAccount, userRoleIds, customFields: rawCustomFields, ...employeeData } = validated;

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

    let customFields: Record<string, unknown> | null = null;
    if (rawCustomFields) {
      const defs = await getCustomFieldDefinitions("employee");
      customFields = validateCustomFields(rawCustomFields, defs);
    }

    const employee = await tx.employee.create({
      data: cleanEmployeeDataForPrisma({
        ...employeeData,
        customFields,
        tenantId,
      } as unknown as Record<string, unknown>),
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
  const { customFields: rawCustomFields, ...employeeData } = validated;

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

    let customFields: Record<string, unknown> | null = null;
    if (rawCustomFields) {
      const defs = await getCustomFieldDefinitions("employee");
      customFields = validateCustomFields(rawCustomFields, defs);
    }

    const employee = await tx.employee.update({
      where: { id },
      data: cleanEmployeeDataForPrisma({ ...employeeData, customFields } as unknown as Record<string, unknown>),
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

export async function exportEmployeesToCSV(): Promise<{ success: boolean; csv?: string; error?: string }> {
  const { tenantId } = await requirePermission("employees:export");
  const defs = await getCustomFieldDefinitions("employee");

  return withTenant(tenantId, async (tx) => {
    const employees = await tx.employee.findMany({
      where: { tenantId },
      include: { department: { select: { name: true } }, position: { select: { name: true } }, payGrade: { select: { name: true } } },
      orderBy: { lastName: 'asc' },
    });

    const headers = [
      "Mitarbeiternummer",
      "Vorname",
      "Nachname",
      "E-Mail",
      "Telefon",
      "Abteilung",
      "Position",
      "Entgeltgruppe",
      "Beschäftigungsart",
      "Status",
      "Geburtsdatum",
      "Eintrittsdatum",
      "Austrittsdatum",
      "Stundensatz",
      "Urlaubstage",
      "Straße",
      "PLZ",
      "Stadt",
      "Land",
      "Steuer-ID",
      "Sozialversicherungsnummer",
      "IBAN",
      "BIC",
      "Notfallkontakt Name",
      "Notfallkontakt Telefon",
      ...defs.map((d) => d.name),
    ];

    const escapeCsv = (value: unknown) => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };

    const rows = employees.map((e) => [
      e.employeeNumber,
      e.firstName,
      e.lastName,
      e.email,
      e.phone,
      e.department?.name ?? "",
      e.position?.name ?? "",
      (e as unknown as { payGrade?: { name?: string } }).payGrade?.name ?? "",
      e.employmentType,
      e.status,
      e.birthDate ? new Date(e.birthDate).toLocaleDateString("de-DE") : "",
      e.startDate ? new Date(e.startDate).toLocaleDateString("de-DE") : "",
      e.exitDate ? new Date(e.exitDate).toLocaleDateString("de-DE") : "",
      (e as unknown as Record<string, unknown>).hourlyWage,
      (e as unknown as Record<string, unknown>).vacationDays,
      ((e.address as Record<string, string> | null | undefined) ?? {}).street,
      ((e.address as Record<string, string> | null | undefined) ?? {}).zip,
      ((e.address as Record<string, string> | null | undefined) ?? {}).city,
      ((e.address as Record<string, string> | null | undefined) ?? {}).country,
      ((e.sensitiveData as Record<string, string> | null | undefined) ?? {}).taxId,
      ((e.sensitiveData as Record<string, string> | null | undefined) ?? {}).socialSecurityNumber,
      ((e.sensitiveData as Record<string, string> | null | undefined) ?? {}).iban,
      ((e.sensitiveData as Record<string, string> | null | undefined) ?? {}).bic,
      ((e.sensitiveData as Record<string, string> | null | undefined) ?? {}).emergencyContactName,
      ((e.sensitiveData as Record<string, string> | null | undefined) ?? {}).emergencyContactPhone,
      ...defs.map((d) => {
        const raw = (e.customFields as Record<string, unknown> | null | undefined)?.[d.key];
        return Array.isArray(raw) ? raw.join(", ") : raw;
      }),
    ]);

    const csv = [headers.join(";"), ...rows.map((row) => row.map(escapeCsv).join(";"))].join("\n");
    return { success: true, csv };
  });
}
