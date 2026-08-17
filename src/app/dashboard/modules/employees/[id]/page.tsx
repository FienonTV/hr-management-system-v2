"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, FileText, ArrowLeft, Pencil, Award, Plane } from "lucide-react";
import { getEmployeeById } from "@/lib/actions/employees";
import { listFiles } from "@/lib/actions/files";
import { getDepartments, getPositions, getPayGrades, getCustomFieldDefinitions } from "@/lib/actions/employeeCatalogs";
import ReadOnlyStammdaten from "./ReadOnlyStammdaten";
import DocumentsTab from "./DocumentsTab";
import UserTab from "./UserTab";
import QualifikationenTab from "./QualifikationenTab";
import AbwesenheitenTab from "./AbwesenheitenTab";
import type { Employee, FileItem } from "./types";

type Tab = "stammdaten" | "dokumente" | "user" | "qualifikationen" | "abwesenheiten";

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("stammdaten");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Record<string, string>>({});
  const [positions, setPositions] = useState<Record<string, string>>({});
  const [payGrades, setPayGrades] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<{ id: string; key: string; name: string; fieldType: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "MULTI_SELECT" }[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { id } = await params;
        const [empData, depts, pos, pgs, defs] = await Promise.all([
          getEmployeeById(id),
          getDepartments(),
          getPositions(),
          getPayGrades(),
          getCustomFieldDefinitions("employee"),
        ]);
        if (!cancelled) {
          if (empData) {
            setEmployee(empData as unknown as Employee);
            setDepartments(Object.fromEntries(depts.map((d) => [d.id, d.name])));
            setPositions(Object.fromEntries(pos.map((p) => [p.id, p.name])));
            setPayGrades(Object.fromEntries(pgs.map((pg) => [pg.id, pg.name])));
            setCustomFields(defs.map((d) => ({ id: d.id, key: d.key, name: d.name, fieldType: d.fieldType })));
            const fileResult = await listFiles({ employeeId: id, limit: 100 });
            setFiles(fileResult.files);
          } else {
            setError("Mitarbeiter nicht gefunden");
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Fehler beim Laden");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [params]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <p className="text-gray-600">Laden...</p>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error || "Mitarbeiter nicht gefunden"}</div>
      </div>
    );
  }

  const tabs = [
    { id: "stammdaten" as Tab, label: "Stammdaten", icon: FileText },
    { id: "qualifikationen" as Tab, label: "Qualifikationen", icon: Award },
    { id: "abwesenheiten" as Tab, label: "Abwesenheiten", icon: Plane },
    { id: "dokumente" as Tab, label: "Dokumente", icon: FileText },
    { id: "user" as Tab, label: "Benutzer-Account", icon: ShieldCheck },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="mt-2 text-sm text-gray-600">Mitarbeiter-Detailansicht</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href={`/dashboard/modules/employees/${employee.id}/edit`}
            className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            <span>Bearbeiten</span>
          </Link>
          <Link
            href="/dashboard/modules/employees"
            className="flex items-center space-x-1 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Zurück</span>
          </Link>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "stammdaten" && (
        <ReadOnlyStammdaten
          employee={employee}
          departmentName={departments[(employee as unknown as Record<string, string>).departmentId]}
          positionName={positions[(employee as unknown as Record<string, string>).positionId]}
          payGradeName={payGrades[(employee as unknown as Record<string, string>).payGradeId]}
          customFields={customFields}
        />
      )}
      {activeTab === "qualifikationen" && <QualifikationenTab employeeId={employee.id} />}
      {activeTab === "abwesenheiten" && <AbwesenheitenTab employeeId={employee.id} />}
      {activeTab === "dokumente" && <DocumentsTab employeeId={employee.id} employee={employee} />}
      {activeTab === "user" && <UserTab employeeId={employee.id} email={employee.email} />}
    </div>
  );
}
