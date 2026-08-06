"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, FileText, ArrowLeft } from "lucide-react";
import { getEmployeeById } from "@/lib/actions/employees";
import { listFiles } from "@/lib/actions/files";
import { getDepartments, getPositions, getPayGrades } from "@/lib/actions/employeeCatalogs";
import { getCustomFieldDefinitions } from "@/lib/actions/employeeCatalogs";
import StammdatenTab from "../StammdatenTab";
import DocumentsTab from "../DocumentsTab";
import UserTab from "../UserTab";
import type { Employee, FileItem } from "../types";
import type { StammdatenTabProps } from "../StammdatenTab";

type Tab = "stammdaten" | "dokumente" | "user";

export default function EmployeeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("stammdaten");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<{ id: string; name: string }[]>([]);
  const [payGrades, setPayGrades] = useState<{ id: string; name: string }[]>([]);
  const [customFields, setCustomFields] = useState<StammdatenTabProps["customFields"]>([]);

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
            setDepartments(depts);
            setPositions(pos);
            setPayGrades(pgs);
            setCustomFields(defs as unknown as StammdatenTabProps["customFields"]);
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
          <p className="mt-2 text-sm text-gray-600">Mitarbeiter bearbeiten</p>
        </div>
        <Link
          href="/dashboard/modules/employees"
          className="flex items-center space-x-1 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Zurück zur Übersicht</span>
        </Link>
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
        <StammdatenTab
          employee={employee}
          departments={departments}
          positions={positions}
          payGrades={payGrades}
          customFields={customFields.map((d) => ({ ...d, options: d.options }))}
        />
      )}
      {activeTab === "dokumente" && <DocumentsTab employeeId={employee.id} employee={employee} />}
      {activeTab === "user" && <UserTab employeeId={employee.id} email={employee.email} />}
    </div>
  );
}
