"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/auth/reset", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }),
    });
    setBusy(false);
    if (!r.ok) { setErr((await r.json()).error || "Could not reset password."); return; }
    router.push("/"); router.refresh();
  }

  return (
    <div className="auth-card">
      <h1>Set a new password</h1>
      <p className="sub">Choose a new password for your account.</p>
      <form onSubmit={submit}>
        <div className="group">
          <label className="field-label">New password</label>
          <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required autoFocus />
        </div>
        {err && <p className="err">{err}</p>}
        <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>{busy ? "…" : "Set password & sign in"}</button>
      </form>
      <p className="alt"><Link href="/login">Back to sign in</Link></p>
    </div>
  );
}
