"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Lock, Trash2, Mail, User, Check, Copy } from "lucide-react";
import {
  getEmployeeUser,
  createEmployeeUser,
  updateEmployeeUser,
  deleteEmployeeUser,
  resetEmployeeUserPassword,
  getAssignableRoles,
} from "@/lib/actions/employeeUsers";
import { createInvitation } from "@/lib/actions/invitations";
import type { RoleOption, EmployeeUserData } from "./types";
import { Field } from "./Field";

export default function UserTab({ employeeId, email }: { employeeId: string; email: string | null }) {
  const [userData, setUserData] = useState<EmployeeUserData | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [userResult, roleList] = await Promise.all([getEmployeeUser(employeeId), getAssignableRoles()]);
        if (!cancelled) {
          if (userResult.success && userResult.user) {
            setUserData(userResult.user);
          }
          setRoles(roleList);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [employeeId]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const result = await createEmployeeUser({
      employeeId,
      email: String(formData.get("email")),
      roleIds: Array.from(formData.getAll("roleIds") as Iterable<string>),
    });
    if (!result.success) {
      setError(result.error || "Fehler");
      return;
    }
    setTempPassword(result.tempPassword || null);
    const refreshed = await getEmployeeUser(employeeId);
    if (refreshed.success && refreshed.user) setUserData(refreshed.user);
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const result = await updateEmployeeUser({
      employeeId,
      roleIds: Array.from(formData.getAll("roleIds") as Iterable<string>),
      isActive: formData.get("isActive") === "on",
    });
    if (!result.success) {
      setError(result.error || "Fehler");
      return;
    }
    const refreshed = await getEmployeeUser(employeeId);
    if (refreshed.success && refreshed.user) setUserData(refreshed.user);
  }

  async function handleReset() {
    setError(null);
    const result = await resetEmployeeUserPassword(employeeId);
    if (!result.success) {
      setError(result.error || "Fehler");
      return;
    }
    setTempPassword(result.tempPassword || null);
  }

  async function handleDelete() {
    if (!confirm("Benutzer-Account wirklich entfernen?")) return;
    const result = await deleteEmployeeUser(employeeId);
    if (!result.success) {
      setError(result.error || "Fehler");
      return;
    }
    setUserData(null);
  }

  async function handleInvite() {
    setError(null);
    if (!email) {
      setError("Mitarbeiter hat keine E-Mail-Adresse");
      return;
    }
    const result = await createInvitation({ email, roleIds: [], employeeId });
    if (!result.success) {
      setError(result.error || "Fehler");
      return;
    }
    setInvitationToken(result.token || null);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <p className="text-gray-600">Laden...</p>;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {tempPassword && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
          <p className="font-medium">Temporäres Passwort:</p>
          <div className="mt-2 flex items-center space-x-2">
            <code className="rounded bg-white px-2 py-1 font-mono">{tempPassword}</code>
            <button onClick={() => copy(tempPassword)} className="text-green-700 hover:text-green-900">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {invitationToken && (
        <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-medium">Einladungs-Link erstellt:</p>
          <div className="mt-2 flex items-center space-x-2">
            <code className="rounded bg-white px-2 py-1 font-mono break-all">{`${typeof window !== "undefined" ? window.location.origin : ""}/invitation/${invitationToken}`}</code>
            <button onClick={() => copy(invitationToken)} className="text-blue-700 hover:text-blue-900">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {userData ? (
        <form onSubmit={handleUpdate} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-primary-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">{userData.email}</h3>
              <p className="text-sm text-gray-600">{userData.isActive ? "Aktiv" : "Inaktiv"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <input type="checkbox" name="isActive" defaultChecked={userData.isActive} className="rounded border-gray-300" />
              <span>Account aktiv</span>
            </label>
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-gray-700">Rollen</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center space-x-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="roleIds"
                    value={role.id}
                    defaultChecked={userData.roles.some((r) => r.id === role.id)}
                    className="rounded border-gray-300"
                  />
                  <span>{role.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="submit"
              className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Save className="h-4 w-4" />
              <span>Speichern</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Lock className="h-4 w-4" />
              <span>Passwort zurücksetzen</span>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center space-x-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>Account entfernen</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Benutzer-Account erstellen</h3>
            <Field label="E-Mail" name="email" type="email" defaultValue={email ?? ""} required />
            <div className="space-y-2">
              <span className="block text-sm font-medium text-gray-700">Rollen</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center space-x-2 text-sm text-gray-700">
                    <input type="checkbox" name="roleIds" value={role.id} className="rounded border-gray-300" />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              <span>Account erstellen</span>
            </button>
          </form>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Oder Einladung senden</h3>
            <p className="text-sm text-gray-600">
              Der Mitarbeiter erhält einen Link und legt selbst ein Passwort fest.
            </p>
            <button
              onClick={handleInvite}
              className="flex items-center space-x-2 rounded-lg border border-primary-300 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
            >
              <Mail className="h-4 w-4" />
              <span>Einladung erstellen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
