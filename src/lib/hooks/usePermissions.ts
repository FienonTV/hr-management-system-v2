"use client";

import { useEffect, useState, useCallback } from "react";
import { getCurrentUserPermissions } from "@/lib/actions/permissions";

export function usePermissions() {
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await getCurrentUserPermissions();
        if (!cancelled) {
          setPermissions(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Berechtigungen konnten nicht geladen werden");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const has = useCallback(
    (permissionKey: string) => permissions.has(permissionKey),
    [permissions]
  );

  return { permissions, has, loading, error };
}
