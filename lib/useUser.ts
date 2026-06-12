"use client";
import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import type { PublicUser } from "./types";

export function useUser() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const j = await r.json();
      setUser(j.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-check the session on mount and on every client navigation, so the header
  // reflects sign-in/out without a manual refresh (login redirects → route change).
  useEffect(() => { refresh(); }, [refresh, pathname]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  return { user, loading, refresh, logout };
}
