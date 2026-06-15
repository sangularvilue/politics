"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@/lib/useUser";
import { PrefsPopover } from "./PrefsPopover";
import { TagColorModal } from "./TagColorModal";
import { NotificationsBell } from "./NotificationsBell";

export function SiteHeader() {
  const { user, logout } = useUser();
  const path = usePathname();
  const router = useRouter();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const is = (p: string) => (path === p || path.startsWith(p + "/") ? "active" : "");

  // Close the compact menu on navigation, Escape, or an outside click.
  useEffect(() => { setMenuOpen(false); }, [path]);
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  const signOut = async () => { await logout(); router.refresh(); };

  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-title">Aristotle&rsquo;s Politics</span>
        <span className="latin">tr. Jowett</span>
      </Link>
      <nav className="nav">
        {/* Primary text links — collapse into the compact menu on small screens. */}
        <Link href="/read/1/1" className={`nav-link ${is("/read")}`}>Read</Link>
        <Link href="/browse" className={`nav-link ${is("/browse")}`}>Browse</Link>
        <Link href="/search" className={`icon-btn ${is("/search")}`} title="Search" aria-label="Search">⌕</Link>
        <Link href="/about" className={`nav-link ${is("/about")}`}>About</Link>
        <div className="prefs-wrap">
          <button className={`icon-btn prefs-btn${prefsOpen ? " active" : ""}`} onClick={() => setPrefsOpen((v) => !v)} title="Reading preferences" aria-label="Reading preferences">⚙</button>
          {prefsOpen && <PrefsPopover onClose={() => setPrefsOpen(false)} />}
        </div>
        {user?.isAdmin && <button className="nav-admin" onClick={() => setAdminOpen(true)} title="Tag colors">Admin</button>}
        {user ? (
          <>
            <NotificationsBell />
            <Link href={`/authors/${user.id}`} className="nav-link nav-user" title="Your annotations" style={{ color: "var(--ink)" }}>{user.displayName}</Link>
            <button className="btn nav-signout" onClick={signOut}>Sign out</button>
          </>
        ) : (
          <Link href={`/login?next=${encodeURIComponent(path)}`} className="btn nav-signin">Sign in</Link>
        )}

        {/* Compact menu — only shown on small screens (see globals.css). */}
        <div className="nav-burger-wrap" ref={menuRef}>
          <button
            className={`icon-btn nav-burger${menuOpen ? " active" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
          {menuOpen && (
            <div className="nav-menu" role="menu" aria-label="Site menu">
              <Link href="/read/1/1" className={`nav-menu-item ${is("/read")}`} role="menuitem">Read</Link>
              <Link href="/browse" className={`nav-menu-item ${is("/browse")}`} role="menuitem">Browse</Link>
              <Link href="/about" className={`nav-menu-item ${is("/about")}`} role="menuitem">About</Link>
              <button className="nav-menu-item" role="menuitem" onClick={() => { setMenuOpen(false); setPrefsOpen(true); }}>
                <span className="nmi-gly">⚙</span>Reading preferences
              </button>
              {user?.isAdmin && (
                <button className="nav-menu-item" role="menuitem" onClick={() => { setMenuOpen(false); setAdminOpen(true); }}>
                  <span className="nmi-gly">◆</span>Tag colors
                </button>
              )}
              <div className="nav-menu-sep" />
              {user ? (
                <>
                  <Link href={`/authors/${user.id}`} className="nav-menu-item nav-menu-user" role="menuitem">
                    <span className="nmi-sub">Signed in as</span>{user.displayName}
                  </Link>
                  <button className="nav-menu-item" role="menuitem" onClick={() => { setMenuOpen(false); signOut(); }}>Sign out</button>
                </>
              ) : (
                <Link href={`/login?next=${encodeURIComponent(path)}`} className="nav-menu-item" role="menuitem">Sign in</Link>
              )}
            </div>
          )}
        </div>
      </nav>
      {adminOpen && <TagColorModal onClose={() => setAdminOpen(false)} />}
    </header>
  );
}
