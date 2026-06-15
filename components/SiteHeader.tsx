"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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

  const is = (p: string) => (path === p || path.startsWith(p + "/") ? "active" : "");

  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-title">Aristotle&rsquo;s Politics</span>
        <span className="latin">tr. Jowett</span>
      </Link>
      <nav className="nav">
        <Link href="/read/1/1" className={is("/read")}>Read</Link>
        <Link href="/browse" className={is("/browse")}>Browse</Link>
        <Link href="/search" className={`icon-btn ${is("/search")}`} title="Search" aria-label="Search">⌕</Link>
        <Link href="/about" className={is("/about")}>About</Link>
        <div style={{ position: "relative" }}>
          <button className={`icon-btn${prefsOpen ? " active" : ""}`} onClick={() => setPrefsOpen((v) => !v)} title="Reading preferences" aria-label="Reading preferences">⚙</button>
          {prefsOpen && <PrefsPopover onClose={() => setPrefsOpen(false)} />}
        </div>
        {user?.isAdmin && <button className="nav-admin" onClick={() => setAdminOpen(true)} title="Tag colors">Admin</button>}
        {user ? (
          <>
            <NotificationsBell />
            <Link href={`/authors/${user.id}`} title="Your annotations" style={{ color: "var(--ink)" }}>{user.displayName}</Link>
            <button className="btn" onClick={async () => { await logout(); router.refresh(); }}>Sign out</button>
          </>
        ) : (
          <Link href={`/login?next=${encodeURIComponent(path)}`} className="btn">Sign in</Link>
        )}
      </nav>
      {adminOpen && <TagColorModal onClose={() => setAdminOpen(false)} />}
    </header>
  );
}
