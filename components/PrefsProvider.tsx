"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { PrefsContext, DEFAULT_PREFS, STORAGE_KEY, applyPrefs, loadLocalPrefs, type Prefs } from "@/lib/prefs";

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const loggedIn = useRef(false);

  // hydrate from localStorage, then from Redis if signed in
  useEffect(() => {
    const local = loadLocalPrefs();
    setPrefs(local);
    applyPrefs(local);
    (async () => {
      try {
        const r = await fetch("/api/prefs");
        const j = await r.json();
        if (j.prefs) {
          loggedIn.current = true;
          const merged = { ...local, ...j.prefs };
          setPrefs(merged);
          applyPrefs(merged);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
        }
      } catch {}
    })();
  }, []);

  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      applyPrefs(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      if (loggedIn.current) {
        fetch("/api/prefs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: value }) }).catch(() => {});
      }
      return next;
    });
  }, []);

  return <PrefsContext.Provider value={{ prefs, setPref }}>{children}</PrefsContext.Provider>;
}
