"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [devLink, setDevLink] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/auth/forgot", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false); setSent(true);
    if (j.devLink) setDevLink(j.devLink);
  }

  return (
    <div className="auth-card">
      <h1>Reset your password</h1>
      {sent ? (
        <>
          <p className="sub">If an account exists for <b>{email}</b>, we&rsquo;ve sent a reset link. It&rsquo;s valid for one hour.</p>
          {devLink && <p style={{ fontSize: ".8rem", wordBreak: "break-all" }}><a href={devLink} style={{ color: "var(--accent)" }}>{devLink}</a></p>}
          <p className="alt"><Link href="/login">Back to sign in</Link></p>
        </>
      ) : (
        <>
          <p className="sub">Enter your email and we&rsquo;ll send you a link to set a new password.</p>
          <form onSubmit={submit}>
            <div className="group">
              <label className="field-label">Email</label>
              <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>{busy ? "…" : "Send reset link"}</button>
          </form>
          <p className="alt"><Link href="/login">Back to sign in</Link></p>
        </>
      )}
    </div>
  );
}
