"use client";

import { useEffect, useState } from "react";
import { getWooCommerceSetting, saveWooCommerceSetting } from "@/lib/actions/woocommerce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

export default function WooCommerceAdminPage() {
  const [setting, setSetting] = useState<{ storeUrl: string; consumerKey: string; consumerSecret: string; isActive: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const s = await getWooCommerceSetting();
    setSetting(s ? { storeUrl: s.storeUrl, consumerKey: "", consumerSecret: "", isActive: s.isActive } : { storeUrl: "", consumerKey: "", consumerSecret: "", isActive: true });
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!setting) return;
    const res = await saveWooCommerceSetting(setting);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <p className="p-6">Lade...</p>;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">WooCommerce-Einstellungen</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Shop-Verbindung</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {saved && <p className="text-sm text-green-600">Gespeichert.</p>}
            <div className="space-y-1">
              <Label htmlFor="storeUrl">Shop-URL</Label>
              <Input id="storeUrl" value={setting?.storeUrl} onChange={(e) => setSetting((s) => (s ? { ...s, storeUrl: e.target.value } : s))} placeholder="https://shop.example.com" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="consumerKey">Consumer Key</Label>
              <Input id="consumerKey" value={setting?.consumerKey} onChange={(e) => setSetting((s) => (s ? { ...s, consumerKey: e.target.value } : s))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="consumerSecret">Consumer Secret</Label>
              <Input id="consumerSecret" type="password" value={setting?.consumerSecret} onChange={(e) => setSetting((s) => (s ? { ...s, consumerSecret: e.target.value } : s))} />
            </div>
            <div className="flex items-center gap-2">
              <input id="isActive" type="checkbox" checked={setting?.isActive} onChange={(e) => setSetting((s) => (s ? { ...s, isActive: e.target.checked } : s))} />
              <Label htmlFor="isActive">Aktiv</Label>
            </div>
            <Button type="submit">Speichern</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
