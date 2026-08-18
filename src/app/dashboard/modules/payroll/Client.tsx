"use client";

import { useState } from "react";
import { exportPayrollCsv } from "@/lib/actions/payroll";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Euro } from "lucide-react";

export default function PayrollPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleExport() {
    setLoading(true);
    setMessage("");
    const res = await exportPayrollCsv(year, month);
    if (!res.success) {
      setMessage(res.error);
      setLoading(false);
      return;
    }
    const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.filename;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(`${res.filename} generiert.`);
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Euro className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Lohnabrechnungs-Export</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monat auswählen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="year">Jahr</Label>
              <Input id="year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="month">Monat</Label>
              <Input id="month" type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} />
            </div>
          </div>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? "Generiere..." : "CSV herunterladen"}
          </Button>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
