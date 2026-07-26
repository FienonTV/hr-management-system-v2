/**
 * Ersetzt {{variable}}-Platzhalter im Template-HTML durch echte Mitarbeiterdaten.
 */

import type { Employee, Prisma } from "@prisma/client";

type EmployeeWithAddress = Employee & { address?: Prisma.JsonValue | null };

function formatDate(date: Date | null | undefined): string {
  if (!date) return "[nicht angegeben]";
  return new Date(date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatToday(): string {
  return new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function val(v: string | null | undefined): string {
  return v?.trim() || "[nicht angegeben]";
}

function getJsonField(address: Prisma.JsonValue | null | undefined, key: string): string | null {
  if (address == null || typeof address !== "object" || Array.isArray(address)) return null;
  const value = (address as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function getSensitiveField(
  sensitiveData: Prisma.JsonValue | null | undefined,
  key: string
): string | null {
  if (sensitiveData == null || typeof sensitiveData !== "object" || Array.isArray(sensitiveData)) {
    return null;
  }
  const value = (sensitiveData as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

export interface TemplateContext {
  [key: string]: string;
}

export function buildVariableMap(
  employee: EmployeeWithAddress,
  tenantName: string,
  customValues: Record<string, string> = {}
): TemplateContext {
  const address = employee.address ?? null;
  const sensitive = employee.sensitiveData ?? null;

  return {
    // Person
    vorname: val(employee.firstName),
    nachname: val(employee.lastName),
    vollname: `${employee.firstName} ${employee.lastName}`.trim(),
    mitarbeiternummer: val(employee.employeeNumber),
    geburtsdatum: formatDate(employee.birthDate),
    geschlecht: employee.gender ?? "[nicht angegeben]",

    // Kontakt & Beschäftigung
    position: val(employee.position),
    abteilung: val(employee.department),
    email: val(employee.email),
    telefon: val(employee.phone),
    beschaeftigungsart: employee.employmentType ?? "[nicht angegeben]",
    status: employee.status ?? "[nicht angegeben]",

    // Adresse (JSON)
    strasse: val(getJsonField(address, "street")),
    plz: val(getJsonField(address, "zipCode") ?? getJsonField(address, "zip")),
    stadt: val(getJsonField(address, "city")),
    land: val(getJsonField(address, "country")),

    // Stammdaten / Vertrag
    startdatum: formatDate(employee.startDate),
    austrittsdatum: formatDate(employee.exitDate),

    // Sensitive Daten (JSON)
    sozialversicherungsnummer: val(getSensitiveField(sensitive, "socialSecurityNumber")),
    steueridentifikationsnummer: val(getSensitiveField(sensitive, "taxId")),
    steuerid: val(getSensitiveField(sensitive, "taxId")),
    iban: val(getSensitiveField(sensitive, "iban")),
    bic: val(getSensitiveField(sensitive, "bic")),
    krankenversicherung: val(getSensitiveField(sensitive, "healthInsurance")),

    // Firma / Zeit
    firmenname: val(tenantName),
    datum: formatToday(),
    heute: formatToday(),

    // Legacy-Kompatibilität (Englisch)
    firstName: val(employee.firstName),
    lastName: val(employee.lastName),
    employeeNumber: val(employee.employeeNumber),
    birthDate: formatDate(employee.birthDate),
    position_en: val(employee.position),
    department_en: val(employee.department),
    email_en: val(employee.email),
    phone_en: val(employee.phone),
    startDate: formatDate(employee.startDate),
    exitDate: formatDate(employee.exitDate),
    street: val(getJsonField(address, "street")),
    zipCode: val(getJsonField(address, "zipCode") ?? getJsonField(address, "zip")),
    city: val(getJsonField(address, "city")),
    country: val(getJsonField(address, "country")),
    socialSecurityNumber: val(getSensitiveField(sensitive, "socialSecurityNumber")),
    taxId: val(getSensitiveField(sensitive, "taxId")),
    healthInsurance: val(getSensitiveField(sensitive, "healthInsurance")),
    today: formatToday(),
    tenantName: val(tenantName),

    // Custom-Werte vom Generierungsdialog
    ...customValues,
  };
}

export function substituteVariables(html: string, variables: TemplateContext): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}

/**
 * Erkennt alle {{variable}}-Platzhalter im HTML, die NICHT in AVAILABLE_VARIABLES
 * definiert sind → das sind die Custom-Variablen, die beim Generieren manuell
 * eingegeben werden müssen.
 */
export function extractCustomVariables(html: string): string[] {
  const knownKeys = new Set(AVAILABLE_VARIABLES.map((v) => v.key));
  const matches = html.match(/\{\{(\w+)\}\}/g) ?? [];
  const seen = new Set<string>();
  const custom: string[] = [];
  for (const m of matches) {
    const key = m.slice(2, -2);
    if (!knownKeys.has(key) && !seen.has(key)) {
      seen.add(key);
      custom.push(key);
    }
  }
  return custom;
}

/** Alle verfügbaren Variablen mit Label für die UI */
export const AVAILABLE_VARIABLES: { key: string; label: string; group?: string }[] = [
  // Person
  { key: "vorname", label: "Vorname", group: "Person" },
  { key: "nachname", label: "Nachname", group: "Person" },
  { key: "vollname", label: "Vollständiger Name", group: "Person" },
  { key: "mitarbeiternummer", label: "Mitarbeiternummer", group: "Person" },
  { key: "geburtsdatum", label: "Geburtsdatum", group: "Person" },
  { key: "geschlecht", label: "Geschlecht", group: "Person" },

  // Kontakt & Beschäftigung
  { key: "position", label: "Position", group: "Beschäftigung" },
  { key: "abteilung", label: "Abteilung", group: "Beschäftigung" },
  { key: "email", label: "E-Mail", group: "Kontakt" },
  { key: "telefon", label: "Telefon", group: "Kontakt" },
  { key: "beschaeftigungsart", label: "Beschäftigungsart", group: "Beschäftigung" },
  { key: "status", label: "Mitarbeiterstatus", group: "Beschäftigung" },

  // Adresse
  { key: "strasse", label: "Straße", group: "Adresse" },
  { key: "plz", label: "PLZ", group: "Adresse" },
  { key: "stadt", label: "Stadt", group: "Adresse" },
  { key: "land", label: "Land", group: "Adresse" },

  // Vertrag
  { key: "startdatum", label: "Eintrittsdatum", group: "Vertrag" },
  { key: "austrittsdatum", label: "Austrittsdatum", group: "Vertrag" },

  // Sensitive
  { key: "sozialversicherungsnummer", label: "SV-Nummer", group: "Sensible Daten" },
  { key: "steueridentifikationsnummer", label: "Steuer-ID", group: "Sensible Daten" },
  { key: "iban", label: "IBAN", group: "Sensible Daten" },
  { key: "bic", label: "BIC", group: "Sensible Daten" },
  { key: "krankenversicherung", label: "Krankenversicherung", group: "Sensible Daten" },

  // Firma / Zeit
  { key: "firmenname", label: "Firmenname", group: "Firma" },
  { key: "datum", label: "Heutiges Datum", group: "Firma" },
];

/**
 * Ersetzt Variablen im HTML durch passende Werte und escapet dabei HTML.
 * Wird serverseitig zum Rendern des PDFs verwendet.
 */
export function renderTemplateHtml(
  html: string,
  employee: EmployeeWithAddress,
  tenantName: string,
  customValues: Record<string, string> = {}
): string {
  const variables = buildVariableMap(employee, tenantName, customValues);
  return substituteVariables(html, variables);
}
