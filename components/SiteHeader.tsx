"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/useUser";

export function SiteHeader() {
  const { user, logout } = useUser();
  const path = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<"ink" | "sepia">("ink");

  useEffect(() => {
    const t = (document.documentElement.dataset.theme as "ink" | "sepia") || "ink";
    setTheme(t);
  }, []);

  function toggleTheme() {
    const next = theme === "ink" ? "sepia" : "ink";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("pol-theme", next); } catch {}
  }

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
        <button className="icon-btn" onClick={toggleTheme} title="Toggle reading surface" aria-label="Toggle theme">
          {theme === "ink" ? "☾" : "☀"}
        </button>
        {user ? (
          <>
            <Link href={`/authors/${user.id}`} title="Your annotations" style={{ color: "var(--ink)" }}>
              {user.displayName}
            </Link>
            <button className="btn" onClick={async () => { await logout(); router.refresh(); }}>Sign out</button>
          </>
        ) : (
          <Link href={`/login?next=${encodeURIComponent(path)}`} className="btn">Sign in</Link>
        )}
      </nav>
    </header>
  );
}
