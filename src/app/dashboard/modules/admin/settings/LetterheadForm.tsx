"use client";

import { useState, useCallback } from "react";
import { Upload, FileImage } from "lucide-react";
import { updateLetterheadSettings, type LetterheadSettings } from "@/lib/actions/tenantSettings";

const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_LOGO_SIZE = 2 * 1024 * 1024;

interface LetterheadFormProps {
  initial: LetterheadSettings;
}

export default function LetterheadForm({ initial }: LetterheadFormProps) {
  const [settings, setSettings] = useState(initial);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setMessage({ type: "error", text: "Logo muss PNG oder JPEG sein." });
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      setMessage({ type: "error", text: "Logo darf maximal 2 MB groß sein." });
      return;
    }
    setLogoFile(file);
    setMessage(null);
  };

  const uploadLogo = useCallback(async (): Promise<string | null> => {
    if (!logoFile) return settings.logoFileId;
    const form = new FormData();
    form.append("file", logoFile);
    form.append("category", "AVATAR");
    const resp = await fetch("/api/files", { method: "POST", body: form });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Logo-Upload fehlgeschlagen");
    return data.fileId as string;
  }, [logoFile, settings.logoFileId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const logoFileId = await uploadLogo();
      const result = await updateLetterheadSettings({
        ...settings,
        logoFileId,
      });
      if (result.success) {
        setSettings((s) => ({ ...s, logoFileId }));
        setLogoFile(null);
        setMessage({ type: "success", text: "Briefpapier-Einstellungen gespeichert." });
      } else {
        setMessage({ type: "error", text: result.error || "Speichern fehlgeschlagen." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Fehler" });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Logo (PNG/JPEG, max. 2 MB)</label>
          <div className="mt-1 flex items-center space-x-4">
            <label className="flex cursor-pointer items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Upload className="h-4 w-4" />
              <span>Logo hochladen</span>
              <input type="file" accept="image/png,image/jpeg" onChange={handleLogoChange} className="hidden" />
            </label>
            {logoFile && <span className="text-sm text-gray-600">{logoFile.name}</span>}
            {settings.logoFileId && !logoFile && (
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
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700">Adresszeile 1</label>
          <input
            id="addressLine1"
            type="text"
            value={settings.addressLine1}
            onChange={(e) => setSettings((s) => ({ ...s, addressLine1: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700">Adresszeile 2</label>
          <input
            id="addressLine2"
            type="text"
            value={settings.addressLine2}
            onChange={(e) => setSettings((s) => ({ ...s, addressLine2: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="footerText" className="block text-sm font-medium text-gray-700">Fußzeile</label>
          <input
            id="footerText"
            type="text"
            value={settings.footerText}
            onChange={(e) => setSettings((s) => ({ ...s, footerText: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="marginTop" className="block text-sm font-medium text-gray-700">Oberer Rand</label>
          <input
            id="marginTop"
            type="text"
            value={settings.marginTop}
            onChange={(e) => setSettings((s) => ({ ...s, marginTop: e.target.value }))}
            placeholder="20mm"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="marginBottom" className="block text-sm font-medium text-gray-700">Unterer Rand</label>
          <input
            id="marginBottom"
            type="text"
            value={settings.marginBottom}
            onChange={(e) => setSettings((s) => ({ ...s, marginBottom: e.target.value }))}
            placeholder="20mm"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="marginLeft" className="block text-sm font-medium text-gray-700">Linker Rand</label>
          <input
            id="marginLeft"
            type="text"
            value={settings.marginLeft}
            onChange={(e) => setSettings((s) => ({ ...s, marginLeft: e.target.value }))}
            placeholder="20mm"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label htmlFor="marginRight" className="block text-sm font-medium text-gray-700">Rechter Rand</label>
          <input
            id="marginRight"
            type="text"
            value={settings.marginRight}
            onChange={(e) => setSettings((s) => ({ ...s, marginRight: e.target.value }))}
            placeholder="20mm"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
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

      <div className="flex items-center space-x-3">
        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? "Speichern..." : "Briefpapier speichern"}
        </button>
      </div>
    </form>
  );
}
