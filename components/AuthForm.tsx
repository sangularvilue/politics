"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "register" ? { email, password, displayName } : { email, password }),
    });
    setBusy(false);
    if (!r.ok) { setErr((await r.json()).error || "Something went wrong."); return; }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="auth-card">
      <h1>{mode === "login" ? "Welcome back" : "Join the discussion"}</h1>
      <p className="sub">
        {mode === "login"
          ? "Sign in to highlight passages and join the marginalia."
          : "Create an account to annotate the Politics and reply to others."}
      </p>
      <form onSubmit={submit}>
        {mode === "register" && (
          <div className="group">
            <label className="field-label">Display name</label>
            <input className="field" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How your notes are signed" required />
          </div>
        )}
        <div className="group">
          <label className="field-label">Email</label>
          <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="group">
          <label className="field-label">Password</label>
          <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "register" ? "At least 8 characters" : ""} required />
        </div>
        {err && <p className="err">{err}</p>}
        <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
          {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
      <p className="alt">
        {mode === "login" ? (
          <>New here? <Link href={`/register?next=${encodeURIComponent(next)}`}>Create an account</Link></>
        ) : (
          <>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></>
        )}
      </p>
    </div>
  );
}
