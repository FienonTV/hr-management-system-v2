"use client";

import { User, Mail, Phone, MapPin, Building2, Briefcase, Calendar, CreditCard, HeartPulse, FileText } from "lucide-react";
import type { Employee } from "./types";
import type { CustomFieldType } from "@prisma/client";

interface CustomFieldDef {
  id: string;
  key: string;
  name: string;
  fieldType: CustomFieldType;
}

interface ReadOnlyStammdatenProps {
  employee: Employee;
  departmentName?: string | null;
  positionName?: string | null;
  payGradeName?: string | null;
  customFields?: CustomFieldDef[];
}

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center space-x-2">
        {Icon && <Icon className="h-5 w-5 text-primary-600" />}
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  const display = value === undefined || value === null || value === "" ? "–" : value;
  return (
    <div className="py-2">
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{display}</dd>
    </div>
  );
}

const employmentTypeLabels: Record<string, string> = {
  FULL_TIME: "Vollzeit",
  PART_TIME: "Teilzeit",
  FREELANCE: "Freelancer",
  INTERN: "Praktikum",
  APPRENTICE: "Auszubildender",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Aktiv",
  ONBOARDING: "Einstellung",
  INACTIVE: "Inaktiv",
  TERMINATED: "Ausgeschieden",
};

const genderLabels: Record<string, string> = {
  MALE: "Männlich",
  FEMALE: "Weiblich",
  DIVERS: "Divers",
  NOT_SPECIFIED: "Nicht angegeben",
};

function formatCustomValue(field: CustomFieldDef, value: unknown): string {
  if (value === null || value === undefined) return "–";
  if (field.fieldType === "BOOLEAN") return value ? "Ja" : "Nein";
  if (field.fieldType === "MULTI_SELECT") return Array.isArray(value) ? value.join(", ") : String(value);
  if (field.fieldType === "DATE" && typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("de-DE");
  }
  return String(value);
}

function safeString(value: unknown): string | undefined {
  return value !== undefined && value !== null ? String(value) : undefined;
}

export default function ReadOnlyStammdaten({ employee, departmentName, positionName, payGradeName, customFields = [] }: ReadOnlyStammdatenProps) {
  const addressExists = employee.street || employee.zip || employee.city || employee.country;
  const extra = employee as unknown as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <Section title="Persönliche Daten" icon={User}>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Row label="Vorname" value={employee.firstName} />
          <Row label="Nachname" value={employee.lastName} />
          <Row label="E-Mail" value={employee.email} />
          <Row label="Mitarbeiternummer" value={employee.employeeNumber} />
          <Row label="Telefon" value={employee.phone} />
          <Row label="Geschlecht" value={genderLabels[employee.gender ?? ""] || employee.gender} />
          <Row label="Geburtsdatum" value={employee.birthDate ? new Date(employee.birthDate).toLocaleDateString("de-DE") : undefined} />
        </dl>
      </Section>

      <Section title="Beschäftigung" icon={Briefcase}>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Row label="Position" value={positionName} />
          <Row label="Abteilung" value={departmentName} />
          <Row label="Entgeltgruppe" value={payGradeName} />
          <Row label="Beschäftigungsart" value={employmentTypeLabels[employee.employmentType ?? ""] || employee.employmentType} />
          <Row label="Status" value={statusLabels[employee.status ?? ""] || employee.status} />
          <Row label="Eintrittsdatum" value={employee.startDate ? new Date(employee.startDate).toLocaleDateString("de-DE") : undefined} />
          <Row label="Austrittsdatum" value={employee.exitDate ? new Date(employee.exitDate).toLocaleDateString("de-DE") : undefined} />
          <Row label="Probezeit bis" value={extra.probationEndDate ? new Date(String(extra.probationEndDate)).toLocaleDateString("de-DE") : undefined} />
          <Row label="Befristet bis" value={extra.fixedTermEndDate ? new Date(String(extra.fixedTermEndDate)).toLocaleDateString("de-DE") : undefined} />
          <Row label="Stundensatz" value={extra.hourlyWage !== null && extra.hourlyWage !== undefined ? `${extra.hourlyWage} €` : undefined} />
          <Row label="Urlaubstage" value={extra.vacationDays !== null && extra.vacationDays !== undefined ? String(extra.vacationDays) : undefined} />
          <Row label="Schlüsselnummer" value={safeString(extra.keyNumber)} />
          <Row label="Chipnummer" value={safeString(extra.chipNumber)} />
          <Row label="Führerscheinklassen" value={safeString(extra.driverLicenseClasses)} />
          <Row label="Gabelstaplerschein" value={extra.forkliftLicense ? "Ja" : undefined} />
        </dl>
      </Section>

      <Section title="Adresse" icon={MapPin}>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Row label="Straße" value={employee.street} />
          <Row label="PLZ" value={employee.zip} />
          <Row label="Ort" value={employee.city} />
          <Row label="Land" value={employee.country} />
        </dl>
      </Section>

      <Section title="Bankverbindung & Steuer" icon={CreditCard}>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Row label="Steuer-ID" value={employee.taxId} />
          <Row label="Sozialversicherungsnummer" value={employee.socialSecurityNumber} />
          <Row label="IBAN" value={employee.iban} />
          <Row label="BIC" value={employee.bic} />
        </dl>
      </Section>

      <Section title="Notfallkontakt" icon={HeartPulse}>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Row label="Name" value={employee.emergencyContactName} />
          <Row label="Telefon" value={employee.emergencyContactPhone} />
        </dl>
      </Section>

      {customFields.length > 0 && (
        <Section title="Zusätzliche Felder" icon={FileText}>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customFields.map((field) => (
              <Row key={field.id} label={field.name} value={formatCustomValue(field, extra[field.key])} />
            ))}
          </dl>
        </Section>
      )}

      <Section title="Notizen" icon={FileText}>
        <Row label="Notizen" value={employee.notes} />
      </Section>
    </div>
  );
}
