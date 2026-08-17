"use client";

import { useEffect, useState } from "react";
import { getEmailSetting, saveEmailSetting, testEmailConnection } from "@/lib/actions/email";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";

export default function EmailAdminPage() {
  const [form, setForm] = useState({
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    smtpSecure: false,
    imapHost: "",
    imapPort: 993,
    imapUser: "",
    imapPassword: "",
    imapSecure: true,
    fromAddress: "",
    fromName: "",
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const s = await getEmailSetting();
    if (s) {
      setForm({
        smtpHost: s.smtpHost ?? "",
        smtpPort: s.smtpPort ?? 587,
        smtpUser: s.smtpUser ?? "",
        smtpPassword: "",
        smtpSecure: s.smtpSecure,
        imapHost: s.imapHost ?? "",
        imapPort: s.imapPort ?? 993,
        imapUser: s.imapUser ?? "",
        imapPassword: "",
        imapSecure: s.imapSecure,
        fromAddress: s.fromAddress ?? "",
        fromName: s.fromName ?? "",
        isActive: s.isActive,
      });
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await saveEmailSetting(form);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTest() {
    setTestMessage("");
    const res = await testEmailConnection();
    setTestMessage(res.success ? res.message : res.error);
  }

  if (loading) return <p className="p-6">Lade...</p>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Mail className="h-6 w-6" />
        <h1 className="text-2xl font-bold">E-Mail-Einstellungen</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SMTP / IMAP Konfiguration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {saved && <p className="text-sm text-green-600">Gespeichert.</p>}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input id="smtpHost" value={form.smtpHost} onChange={(e) => setForm((f) => ({ ...f, smtpHost: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="smtpPort">SMTP Port</Label>
                <Input id="smtpPort" type="number" value={form.smtpPort} onChange={(e) => setForm((f) => ({ ...f, smtpPort: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="smtpUser">SMTP User</Label>
                <Input id="smtpUser" value={form.smtpUser} onChange={(e) => setForm((f) => ({ ...f, smtpUser: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="smtpPassword">SMTP Passwort</Label>
                <Input id="smtpPassword" type="password" value={form.smtpPassword} onChange={(e) => setForm((f) => ({ ...f, smtpPassword: e.target.value }))} placeholder="Leer lassen, um bestehendes beizubehalten" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="imapHost">IMAP Host</Label>
                <Input id="imapHost" value={form.imapHost} onChange={(e) => setForm((f) => ({ ...f, imapHost: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="imapPort">IMAP Port</Label>
                <Input id="imapPort" type="number" value={form.imapPort} onChange={(e) => setForm((f) => ({ ...f, imapPort: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="imapUser">IMAP User</Label>
                <Input id="imapUser" value={form.imapUser} onChange={(e) => setForm((f) => ({ ...f, imapUser: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="imapPassword">IMAP Passwort</Label>
                <Input id="imapPassword" type="password" value={form.imapPassword} onChange={(e) => setForm((f) => ({ ...f, imapPassword: e.target.value }))} placeholder="Leer lassen, um bestehendes beizubehalten" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fromAddress">Absender-E-Mail</Label>
                <Input id="fromAddress" type="email" value={form.fromAddress} onChange={(e) => setForm((f) => ({ ...f, fromAddress: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fromName">Absender-Name</Label>
                <Input id="fromName" value={form.fromName} onChange={(e) => setForm((f) => ({ ...f, fromName: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.smtpSecure} onChange={(e) => setForm((f) => ({ ...f, smtpSecure: e.target.checked }))} />
                SMTP TLS
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.imapSecure} onChange={(e) => setForm((f) => ({ ...f, imapSecure: e.target.checked }))} />
                IMAP SSL
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                Aktiv
              </label>
            </div>

            <div className="flex gap-2">
              <Button type="submit">Speichern</Button>
              <Button type="button" variant="outline" onClick={handleTest}>Verbindung testen</Button>
            </div>
          </form>
          {testMessage && <p className="mt-4 text-sm text-muted-foreground">{testMessage}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
