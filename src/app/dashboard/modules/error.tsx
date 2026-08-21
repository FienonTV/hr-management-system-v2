"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ModulesErrorBoundary({ error }: { error: Error & { digest?: string } }) {
  const router = useRouter();

  useEffect(() => {
    if (error.message === "Keine Berechtigung") {
      router.replace("/dashboard?moduleDisabled=true");
    }
  }, [error, router]);

  if (error.message === "Keine Berechtigung") {
    return null;
  }

  return (
    <div className="p-6">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h2 className="text-lg font-semibold text-red-700">Fehler</h2>
        <p className="mt-1 text-sm text-red-600">{error.message}</p>
      </div>
    </div>
  );
}
