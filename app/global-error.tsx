"use client";
import { useEffect } from "react";

/**
 * Root error boundary. Most production client exceptions here are stale-chunk
 * errors after a new deploy (the browser cached an old page whose JS no longer
 * exists). Auto-reload once to fetch the fresh build; if it still fails, show a
 * manual reload so we never loop.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const msg = `${error?.name || ""} ${error?.message || ""}`;
    const stale = /ChunkLoadError|Loading chunk|Loading CSS chunk|import|dynamically imported|Failed to fetch|Importing a module script failed/i.test(msg);
    try {
      const KEY = "pol-reloaded-at";
      const last = Number(sessionStorage.getItem(KEY) || 0);
      // reload at most once per 20s to avoid loops
      if (stale && Date.now() - last > 20000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
      }
    } catch {}
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#111010", color: "#e4ddd0", fontFamily: "Georgia, serif", minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem", textAlign: "center" }}>
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 500, marginBottom: ".6rem" }}>Just a moment…</h1>
          <p style={{ color: "#8a7e6e", fontSize: ".95rem", lineHeight: 1.6, marginBottom: "1.4rem" }}>
            A newer version of <i>Aristotle&rsquo;s Politics</i> is available. Reloading to pick it up.
          </p>
          <button
            onClick={() => { try { sessionStorage.removeItem("pol-reloaded-at"); } catch {} window.location.reload(); }}
            style={{ background: "#c9a44e", color: "#20180a", border: "none", borderRadius: 999, padding: ".55rem 1.4rem", fontWeight: 600, fontSize: ".9rem", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
