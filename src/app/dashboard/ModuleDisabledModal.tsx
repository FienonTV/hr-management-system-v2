"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ModuleDisabledModal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("moduleDisabled") === "true") {
      setOpen(true);
    }
  }, [searchParams]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-3 text-amber-600">
          <AlertTriangle className="h-6 w-6" />
          <h2 className="text-lg font-semibold">Modul nicht verfügbar</h2>
        </div>
        <p className="mb-6 text-sm text-gray-600">
          Sie besitzen keine Berechtigung, auf dieses Modul zuzugreifen, oder es wurde für Ihre Firma deaktiviert. Wenden Sie sich an Ihren Administrator.
        </p>
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setOpen(false);
              router.replace("/dashboard");
            }}
          >
            <X className="mr-1 h-4 w-4" />
            Schließen
          </Button>
        </div>
      </div>
    </div>
  );
}
