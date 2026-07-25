"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitation } from "@/lib/actions/invitations";
import { validatePassword } from "@/lib/passwordPolicy";

export function InvitationAcceptForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPasswordErrors([]);

    const password = String(formData.get("password"));
    const confirmPassword = String(formData.get("confirmPassword"));
    const firstName = String(formData.get("firstName")).trim();
    const lastName = String(formData.get("lastName")).trim();

    if (password !== confirmPassword) {
      setError("Passwörter stimmen nicht überein");
      return;
    }

    const check = validatePassword(password);
    if (!check.valid) {
      setPasswordErrors(check.errors);
      return;
    }

    const result = await acceptInvitation(token, password, firstName, lastName);
    if (!result.success) {
      setError(result.error ?? "Einladung konnte nicht aktiviert werden");
      return;
    }

    router.push("/login?invitation=accepted");
  }

  return (
    <form
      action={handleSubmit}
      className="w-full max-w-md bg-white rounded-lg shadow p-8 space-y-6"
    >
      <h1 className="text-2xl font-semibold text-gray-900">Einladung annehmen</h1>
      <p className="text-sm text-gray-600">
        Willkommen! Erstellen Sie ein Passwort für {email}.
      </p>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            Vorname
          </label>
          <input
            id="firstName"
            name="firstName"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Nachname
          </label>
          <input
            id="lastName"
            name="lastName"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Passwort
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            Mindestens 12 Zeichen, Groß-/Kleinbuchstabe, Ziffer und Sonderzeichen.
          </p>
          {passwordErrors.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-xs text-red-600">
              {passwordErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Passwort wiederholen
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Einladung aktivieren
      </button>
    </form>
  );
}
