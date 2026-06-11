"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Annotation, AnnotationThread, Anchor, PublicUser, Reply } from "@/lib/types";

interface Props {
  book: number;
  chapter: number;
  mode: "create" | "view";
  anchors: Anchor[];
  quote: string;
  ids: string[];
  annotations: Annotation[];
  user: PublicUser | null;
  onClose: () => void;
  onChanged: () => void;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function CommentPanel(props: Props) {
  const { mode, quote, anchors, ids, book, chapter, user, onClose, onChanged } = props;

  return (
    <>
      <div className="panel-scrim" onClick={onClose} />
      <aside className="panel" role="dialog" aria-modal="true">
        <div className="panel-head">
          <h3>{mode === "create" ? "New annotation" : "Discussion"}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {mode === "create" ? (
          <CreateForm book={book} chapter={chapter} anchors={anchors} quote={quote} onClose={onClose} onChanged={onChanged} />
        ) : (
          <ViewThreads ids={ids} user={user} onClose={onClose} onChanged={onChanged} />
        )}
      </aside>
    </>
  );
}

function CreateForm({ book, chapter, anchors, quote, onClose, onChanged }: {
  book: number; chapter: number; anchors: Anchor[]; quote: string; onClose: () => void; onChanged: () => void;
}) {
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!body.trim()) { setErr("Write a comment first."); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        book, chapter, anchors, quote, body: body.trim(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    setBusy(false);
    if (!r.ok) { setErr((await r.json()).error || "Could not save."); return; }
    onChanged(); onClose();
  }

  return (
    <>
      <div className="panel-body">
        <div className="quote-block">“{quote}”</div>
        <label className="field-label">Your note, question, or gloss</label>
        <textarea className="field" rows={6} value={body} autoFocus
          onChange={(e) => setBody(e.target.value)} placeholder="What do you make of this passage?" />
        <div style={{ height: ".8rem" }} />
        <label className="field-label">Tags (comma-separated — e.g. slavery, the-state, virtue)</label>
        <input className="field" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="optional" />
        {err && <p className="err" style={{ color: "#e88", fontSize: ".85rem", marginTop: ".6rem" }}>{err}</p>}
      </div>
      <div className="panel-foot" style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end" }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Post annotation"}</button>
      </div>
    </>
  );
}

function ViewThreads({ ids, user, onClose, onChanged }: {
  ids: string[]; user: PublicUser | null; onClose: () => void; onChanged: () => void;
}) {
  const [threads, setThreads] = useState<AnnotationThread[] | null>(null);

  const load = useCallback(async () => {
    const rows = await Promise.all(ids.map((id) => fetch(`/api/annotations/${id}`).then((r) => r.ok ? r.json() : null)));
    setThreads(rows.filter(Boolean).map((j) => j.thread));
  }, [ids]);

  useEffect(() => { load(); }, [load]);

  if (!threads) return <div className="panel-body"><p className="muted">Loading…</p></div>;
  if (!threads.length) return <div className="panel-body"><p className="empty">This note was removed.</p></div>;

  return (
    <div className="panel-body">
      {threads.map((t) => (
        <ThreadCard key={t.id} thread={t} user={user} reload={async () => { await load(); onChanged(); }} onGone={async () => { await load(); onChanged(); }} />
      ))}
    </div>
  );
}

function ThreadCard({ thread, user, reload, onGone }: {
  thread: AnnotationThread; user: PublicUser | null; reload: () => Promise<void>; onGone: () => Promise<void>;
}) {
  const [replyTo, setReplyTo] = useState<string | null | "root">(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendReply(parentId: string | null) {
    if (!text.trim()) return;
    setBusy(true);
    const r = await fetch(`/api/annotations/${thread.id}/replies`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text.trim(), parentId }),
    });
    setBusy(false);
    if (r.ok) { setText(""); setReplyTo(null); await reload(); }
    else if (r.status === 401) window.location.href = `/login?next=${encodeURIComponent(location.pathname)}`;
  }

  async function del() {
    if (!confirm("Delete this annotation and its replies?")) return;
    const r = await fetch(`/api/annotations/${thread.id}`, { method: "DELETE" });
    if (r.ok) await onGone();
  }

  const nameOf = (id: string) => thread.replies.find((x) => x.id === id)?.authorName || thread.authorName;

  return (
    <div className="annot">
      <div className="quote-block">“{thread.quote}”</div>
      <div className="meta">
        <span className="who"><Link href={`/authors/${thread.userId}`}>{thread.authorName}</Link></span>
        <span>· {timeAgo(thread.createdAt)}</span>
        {user?.id === thread.userId && <button className="reply-btn" style={{ marginLeft: "auto" }} onClick={del}>delete</button>}
      </div>
      <div className="body">{thread.body}</div>
      {thread.tags.length > 0 && (
        <div className="tags">
          {thread.tags.map((t) => <Link key={t} href={`/tags/${t}`} className="tag-chip">#{t}</Link>)}
        </div>
      )}

      {thread.replies.length > 0 && (
        <div className="replies">
          {thread.replies.map((rp) => (
            <div className="reply" key={rp.id}>
              <div className="meta">
                <span className="who"><Link href={`/authors/${rp.userId}`}>{rp.authorName}</Link></span>
                {rp.parentId && <span> · ↳ {nameOf(rp.parentId)}</span>}
                <span> · {timeAgo(rp.createdAt)}</span>
              </div>
              <div className="body">{rp.body}</div>
              <button className="reply-btn" onClick={() => { setReplyTo(rp.id); setText(""); }}>reply</button>
            </div>
          ))}
        </div>
      )}

      {replyTo !== null ? (
        <div style={{ marginTop: ".8rem" }}>
          <textarea className="field" rows={3} autoFocus value={text} onChange={(e) => setText(e.target.value)}
            placeholder={replyTo === "root" ? "Add to the discussion…" : `Reply to ${nameOf(replyTo)}…`} />
          <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end", marginTop: ".5rem" }}>
            <button className="btn" onClick={() => setReplyTo(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy} onClick={() => sendReply(replyTo === "root" ? null : replyTo)}>
              {busy ? "…" : "Reply"}
            </button>
          </div>
        </div>
      ) : (
        <button className="reply-btn" style={{ marginTop: ".6rem" }} onClick={() => { setReplyTo("root"); setText(""); }}>
          {user ? "+ Reply to thread" : "Sign in to reply"}
        </button>
      )}
    </div>
  );
}
