"use client";

import { User, Mail, Phone, MapPin, Building2, Briefcase, Calendar, CreditCard, HeartPulse, FileText } from "lucide-react";
import type { Employee } from "./types";
import { toDateInputValue } from "./Field";

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
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="py-2">
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
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

export default function ReadOnlyStammdaten({ employee }: { employee: Employee }) {
  const addressExists = employee.street || employee.zip || employee.city || employee.country;

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
          <Row label="Position" value={employee.position} />
          <Row label="Abteilung" value={employee.department} />
          <Row label="Beschäftigungsart" value={employmentTypeLabels[employee.employmentType ?? ""] || employee.employmentType} />
          <Row label="Status" value={statusLabels[employee.status ?? ""] || employee.status} />
          <Row label="Eintrittsdatum" value={employee.startDate ? new Date(employee.startDate).toLocaleDateString("de-DE") : undefined} />
          <Row label="Austrittsdatum" value={employee.exitDate ? new Date(employee.exitDate).toLocaleDateString("de-DE") : undefined} />
        </dl>
      </Section>

      {addressExists && (
        <Section title="Adresse" icon={MapPin}>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Row label="Straße" value={employee.street} />
            <Row label="PLZ" value={employee.zip} />
            <Row label="Ort" value={employee.city} />
            <Row label="Land" value={employee.country} />
          </dl>
        </Section>
      )}

      {(employee.taxId || employee.socialSecurityNumber || employee.iban || employee.bic) && (
        <Section title="Bankverbindung & Steuer" icon={CreditCard}>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Row label="Steuer-ID" value={employee.taxId} />
            <Row label="Sozialversicherungsnummer" value={employee.socialSecurityNumber} />
            <Row label="IBAN" value={employee.iban} />
            <Row label="BIC" value={employee.bic} />
          </dl>
        </Section>
      )}

      {(employee.emergencyContactName || employee.emergencyContactPhone) && (
        <Section title="Notfallkontakt" icon={HeartPulse}>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Row label="Name" value={employee.emergencyContactName} />
            <Row label="Telefon" value={employee.emergencyContactPhone} />
          </dl>
        </Section>
      )}

      {employee.notes && (
        <Section title="Notizen" icon={FileText}>
          <p className="whitespace-pre-wrap text-sm text-gray-900">{employee.notes}</p>
        </Section>
      )}
    </div>
  );
}
