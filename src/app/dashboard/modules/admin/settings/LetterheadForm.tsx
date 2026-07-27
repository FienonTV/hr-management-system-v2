"use client";

import { useState, useRef } from "react";
import { Upload, FileImage } from "lucide-react";
import { saveLetterheadSettings, type LetterheadSettings } from "@/lib/actions/tenantSettings";

const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const ALLOWED_BACKGROUND_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const MAX_BACKGROUND_SIZE = 10 * 1024 * 1024;

interface LetterheadFormProps {
  initial: LetterheadSettings;
}

export default function LetterheadForm({ initial }: LetterheadFormProps) {
  const [settings, setSettings] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isBuild = settings.mode === "build";
  const isUpload = settings.mode === "upload";

  function validateFile(
    file: File | null | undefined,
    allowedTypes: string[],
    maxSize: number,
    label: string
  ): string | null {
    if (!file || file.size === 0) return null;
    if (!allowedTypes.includes(file.type)) {
      return `${label} muss ${allowedTypes.includes("application/pdf") ? "PDF oder Bild" : "PNG oder JPEG"} sein.`;
    }
    if (file.size > maxSize) {
      return `${label} darf maximal ${maxSize / 1024 / 1024} MB groß sein.`;
    }
    return null;
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setMessage(null);

    const logo = formData.get("logoFile") as File | null;
    const background = formData.get("backgroundFile") as File | null;
    const mode = String(formData.get("mode") || "build");

    const logoError = isBuild ? validateFile(logo, ALLOWED_LOGO_TYPES, MAX_LOGO_SIZE, "Logo") : null;
    const backgroundError = isUpload
      ? validateFile(background, ALLOWED_BACKGROUND_TYPES, MAX_BACKGROUND_SIZE, "Briefpapier")
      : null;

    if (logoError || backgroundError) {
      setMessage({ type: "error", text: logoError || backgroundError || "Datei ungültig" });
      setPending(false);
      return;
    }

    // For fields not included as inputs, append current values.
    formData.set("companyName", settings.companyName);
    formData.set("addressLine1", settings.addressLine1);
    formData.set("addressLine2", settings.addressLine2);
    formData.set("footerText", settings.footerText);
    formData.set("marginTop", settings.marginTop);
    formData.set("marginBottom", settings.marginBottom);
    formData.set("marginLeft", settings.marginLeft);
    formData.set("marginRight", settings.marginRight);

    try {
      const result = await saveLetterheadSettings(formData);
      if (result.success) {
        setMessage({ type: "success", text: "Briefpapier-Einstellungen gespeichert." });
        formRef.current?.reset();
      } else {
        setMessage({ type: "error", text: result.error || "Speichern fehlgeschlagen." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Fehler beim Speichern." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-5">
      <input type="hidden" name="mode" value={settings.mode} />

      <div className="flex space-x-4">
        <label className="flex cursor-pointer items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2">
          <input
            type="radio"
            name="mode"
            value="build"
            checked={isBuild}
            onChange={() => setSettings((s) => ({ ...s, mode: "build" }))}
            className="h-4 w-4"
          />
          <span className="text-sm font-medium">Briefpapier zusammenbauen</span>
        </label>
        <label className="flex cursor-pointer items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2">
          <input
            type="radio"
            name="mode"
            value="upload"
            checked={isUpload}
            onChange={() => setSettings((s) => ({ ...s, mode: "upload" }))}
            className="h-4 w-4"
          />
          <span className="text-sm font-medium">Eigenes Briefpapier hochladen</span>
        </label>
      </div>

      {isUpload && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            Lade ein fertiges Briefpapier hoch (PDF oder Bild). Es wird unverändert auf jede Seite gelegt. Die
            Seitenränder verschieben nur den Text.
          </p>
          <div className="mt-3 flex items-center space-x-4">
            <label className="flex cursor-pointer items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
              <Upload className="h-4 w-4" />
              <span>Briefpapier hochladen</span>
              <input
                type="file"
                name="backgroundFile"
                accept="application/pdf,image/png,image/jpeg"
                className="hidden"
              />
            </label>
            {settings.backgroundFileId && (
              <span className="inline-flex items-center text-sm text-green-600">
                <FileImage className="mr-1 h-4 w-4" /> Briefpapier hinterlegt
              </span>
            )}
          </div>
        </div>
      )}

      {isBuild && (
        <div className="grid grid-cols-1 gap-5 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Logo (PNG/JPEG, max. 2 MB)</label>
            <div className="mt-1 flex items-center space-x-4">
              <label className="flex cursor-pointer items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
                <Upload className="h-4 w-4" />
                <span>Logo hochladen</span>
                <input type="file" name="logoFile" accept="image/png,image/jpeg" className="hidden" />
              </label>
              {settings.logoFileId && (
                <span className="inline-flex items-center text-sm text-green-600">
                  <FileImage className="mr-1 h-4 w-4" /> Logo hinterlegt
                </span>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Firmenname</label>
            <input
              id="companyName"
              type="text"
              value={settings.companyName}
              onChange={(e) => setSettings((s) => ({ ...s, companyName: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700">Adresszeile 1</label>
            <input
              id="addressLine1"
              type="text"
              value={settings.addressLine1}
              onChange={(e) => setSettings((s) => ({ ...s, addressLine1: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700">Adresszeile 2</label>
            <input
              id="addressLine2"
              type="text"
              value={settings.addressLine2}
              onChange={(e) => setSettings((s) => ({ ...s, addressLine2: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="footerText" className="block text-sm font-medium text-gray-700">Fußzeile</label>
            <input
              id="footerText"
              type="text"
              value={settings.footerText}
              onChange={(e) => setSettings((s) => ({ ...s, footerText: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        {(
          [
            { id: "marginTop" as const, label: "Oben", placeholder: "20mm" },
            { id: "marginBottom" as const, label: "Unten", placeholder: "20mm" },
            { id: "marginLeft" as const, label: "Links", placeholder: "20mm" },
            { id: "marginRight" as const, label: "Rechts", placeholder: "20mm" },
          ] as const
        ).map(({ id, label, placeholder }) => (
          <div key={id}>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}er Rand</label>
            <input
              id={id}
              type="text"
              value={settings[id]}
              onChange={(e) => setSettings((s) => ({ ...s, [id]: e.target.value }))}
              placeholder={placeholder}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
        ))}
      </div>

      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {pending ? "Speichern..." : "Briefpapier speichern"}
      </button>
    </form>
  );
}
