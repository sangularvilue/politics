"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Notification } from "@/lib/types";

type Notif = Notification & { unread: boolean };

// Local copy — lib/text imports the full text JSON, which we keep out of the client bundle.
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationsBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setItems(j.notifications || []);
      setUnread(j.unread || 0);
    } catch {
      /* keep whatever we had */
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh, pathname]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next && unread > 0) {
        // The open list keeps its "new" highlights; only the badge resets.
        fetch("/api/notifications", { method: "POST" }).then(() => setUnread(0)).catch(() => {});
      }
      return next;
    });
  };

  const go = (n: Notif) => {
    setOpen(false);
    router.push(`/read/${n.book}/${n.chapter}?a=${n.annotationId}`);
  };

  return (
    <div className="notif-wrap" ref={ref}>
      <button
        className={`icon-btn${open ? " active" : ""}`}
        onClick={toggle}
        title="Notifications"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && <span className="notif-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="notif-pop" role="dialog" aria-label="Notifications">
          <div className="notif-head">Notifications</div>
          {items.length === 0 ? (
            <div className="notif-empty">Nothing yet — when someone replies to one of your notes, it will appear here.</div>
          ) : (
            <div className="notif-list">
              {items.map((n) => (
                <button key={n.id} className={`notif-item${n.unread ? " unread" : ""}`} onClick={() => go(n)}>
                  <div className="notif-meta">
                    <strong>{n.actorName}</strong>
                    <span>replied to your {n.reason === "annotation" ? "note" : "reply"} on {ROMAN[n.book]}.{n.chapter}</span>
                    <span className="notif-time">{timeAgo(n.createdAt)}</span>
                  </div>
                  {n.quote && <div className="notif-quote">&ldquo;{n.quote}&rdquo;</div>}
                  <div className="notif-prev">{n.preview}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
