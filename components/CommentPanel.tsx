"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Annotation, AnnotationThread, Anchor, PublicUser, Reply } from "@/lib/types";
import { usePrefs } from "@/lib/prefs";
import { dotColor } from "@/lib/colors";

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
  onReanchor?: (id: string) => void;
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
  const { mode, quote, anchors, ids, book, chapter, user, onClose, onChanged, onReanchor } = props;
  return (
    <>
      <div className="panel-scrim" onClick={onClose} />
      <aside className="panel" role="dialog" aria-modal="true">
        <div className="panel-head">
          <h3>{mode === "create" ? "New annotation" : "Discussion"}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {mode === "create" ? (
          <CreateForm book={book} chapter={chapter} anchors={anchors} quote={quote} user={user} onClose={onClose} onChanged={onChanged} />
        ) : (
          <CommentThreads ids={ids} user={user} onChanged={onChanged} onReanchor={onReanchor} />
        )}
      </aside>
    </>
  );
}

function CreateForm({ anchors, quote, user, onClose, onChanged }: {
  book: number; chapter: number; anchors: Anchor[]; quote: string; user: PublicUser | null; onClose: () => void; onChanged: () => void;
}) {
  const { prefs } = usePrefs();
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagColors, setTagColors] = useState<Record<string, string>>({});
  const [asName, setAsName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const book = (anchors[0]?.blockId.match(/^b(\d+)/) || [])[1];
  const chapter = (anchors[0]?.blockId.match(/\.c(\d+)/) || [])[1];

  useEffect(() => {
    if (!prefs.quickTags) return;
    fetch("/api/tags").then((r) => r.json()).then((j) => setAllTags((j.tags || []).map((t: { tag: string }) => t.tag))).catch(() => {});
    fetch("/api/admin/tag-colors").then((r) => r.json()).then((j) => setTagColors(j.colors || {})).catch(() => {});
  }, [prefs.quickTags]);

  function toggleTag(t: string) {
    setPicked((prev) => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n; });
  }

  async function submit() {
    if (!body.trim()) { setErr("Write a comment first."); return; }
    setBusy(true); setErr("");
    const combined = [...picked, ...tags.split(",").map((t) => t.trim()).filter(Boolean)];
    const r = await fetch("/api/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        book: Number(book), chapter: Number(chapter), anchors, quote, body: body.trim(),
        tags: combined,
        asName: user?.isAdmin ? asName.trim() : undefined,
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
        {prefs.quickTags && allTags.length > 0 && (
          <div className="quick-tags">
            {allTags.map((t) => {
              const dot = prefs.categoricalColors ? dotColor(tagColors[t]) : undefined;
              return (
                <button key={t} type="button" className={`tag-chip-pick${picked.has(t) ? " active" : ""}`}
                  style={picked.has(t) && dot ? { borderColor: dot, color: dot } : undefined}
                  onClick={() => toggleTag(t)}>
                  {dot && <span className="tc-dot" style={{ background: dot }} />}#{t}
                </button>
              );
            })}
          </div>
        )}
        <label className="field-label">{prefs.quickTags ? "More tags (comma-separated)" : "Tags (comma-separated — e.g. slavery, the-state, virtue)"}</label>
        <input className="field" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="optional" />
        {user?.isAdmin && (
          <div className="admin-field">
            <label className="field-label">⚷ Post as (admin) — leave blank to post as yourself</label>
            <input className="field" value={asName} onChange={(e) => setAsName(e.target.value)} placeholder="e.g. Mark Grannis" />
          </div>
        )}
        {err && <p className="err" style={{ color: "#e88", fontSize: ".85rem", marginTop: ".6rem" }}>{err}</p>}
      </div>
      <div className="panel-foot" style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end" }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Post annotation"}</button>
      </div>
    </>
  );
}

export function CommentThreads({ ids, user, onChanged, onReanchor }: {
  ids: string[]; user: PublicUser | null; onChanged: () => void; onReanchor?: (id: string) => void;
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
        <ThreadCard key={t.id} thread={t} user={user} reload={async () => { await load(); onChanged(); }} onReanchor={onReanchor} />
      ))}
    </div>
  );
}

const canEdit = (user: PublicUser | null, ownerId: string) => !!user && (user.isAdmin || user.id === ownerId);

function ThreadCard({ thread, user, reload, onReanchor }: {
  thread: AnnotationThread; user: PublicUser | null; reload: () => Promise<void>; onReanchor?: (id: string) => void;
}) {
  const [replyTo, setReplyTo] = useState<string | null | "root">(null);
  const [editing, setEditing] = useState(false);
  const nameOf = (id: string) => thread.replies.find((x) => x.id === id)?.authorName || thread.authorName;

  async function del() {
    if (!confirm("Delete this annotation and its replies?")) return;
    if ((await fetch(`/api/annotations/${thread.id}`, { method: "DELETE" })).ok) await reload();
  }

  return (
    <div className="annot">
      <div className="quote-block">“{thread.quote}”</div>
      <div className="meta">
        <span className="who"><Link href={`/authors/${thread.userId}`}>{thread.authorName}</Link></span>
        <span>· {timeAgo(thread.createdAt)}{thread.editedAt ? " · edited" : ""}</span>
        {canEdit(user, thread.userId) && (
          <span style={{ marginLeft: "auto", display: "flex", gap: ".7rem" }}>
            <button className="reply-btn" onClick={() => setEditing((v) => !v)}>edit</button>
            <button className="reply-btn" onClick={del}>delete</button>
          </span>
        )}
      </div>

      {editing ? (
        <EditBox
          initialBody={thread.body} initialTags={thread.tags.join(", ")} initialAuthor={thread.authorName}
          isAdmin={!!user?.isAdmin} withTags
          onReanchor={onReanchor && canEdit(user, thread.userId) ? () => onReanchor(thread.id) : undefined}
          onCancel={() => setEditing(false)}
          onSave={async (body, tags, asName) => {
            await fetch(`/api/annotations/${thread.id}`, {
              method: "PATCH", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ body, tags, asName }),
            });
            setEditing(false); await reload();
          }}
        />
      ) : (
        <>
          <div className="body">{thread.body}</div>
          {thread.tags.length > 0 && (
            <div className="tags">{thread.tags.map((t) => <Link key={t} href={`/tags/${t}`} className="tag-chip">#{t}</Link>)}</div>
          )}
        </>
      )}

      {thread.replies.length > 0 && (
        <div className="replies">
          {thread.replies.map((rp) => (
            <ReplyItem key={rp.id} reply={rp} annotId={thread.id} user={user} nameOf={nameOf}
              onReply={() => { setReplyTo(rp.id); }} reload={reload} />
          ))}
        </div>
      )}

      {replyTo !== null ? (
        <ReplyBox
          isAdmin={!!user?.isAdmin}
          placeholder={replyTo === "root" ? "Add to the discussion…" : `Reply to ${nameOf(replyTo)}…`}
          onCancel={() => setReplyTo(null)}
          onSend={async (body, asName) => {
            const r = await fetch(`/api/annotations/${thread.id}/replies`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ body, parentId: replyTo === "root" ? null : replyTo, asName }),
            });
            if (r.status === 401) { window.location.href = `/login?next=${encodeURIComponent(location.pathname)}`; return; }
            setReplyTo(null); await reload();
          }}
        />
      ) : (
        <button className="reply-btn" style={{ marginTop: ".6rem" }} onClick={() => setReplyTo("root")}>
          {user ? "+ Reply to thread" : "Sign in to reply"}
        </button>
      )}
    </div>
  );
}

function ReplyItem({ reply, annotId, user, nameOf, onReply, reload }: {
  reply: Reply; annotId: string; user: PublicUser | null; nameOf: (id: string) => string; onReply: () => void; reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  async function del() {
    if (!confirm("Delete this reply?")) return;
    if ((await fetch(`/api/annotations/${annotId}/replies/${reply.id}`, { method: "DELETE" })).ok) await reload();
  }
  return (
    <div className="reply">
      <div className="meta">
        <span className="who"><Link href={`/authors/${reply.userId}`}>{reply.authorName}</Link></span>
        {reply.parentId && <span> · ↳ {nameOf(reply.parentId)}</span>}
        <span> · {timeAgo(reply.createdAt)}{reply.editedAt ? " · edited" : ""}</span>
      </div>
      {editing ? (
        <EditBox
          initialBody={reply.body} initialAuthor={reply.authorName} isAdmin={!!user?.isAdmin}
          onCancel={() => setEditing(false)}
          onSave={async (body, _tags, asName) => {
            await fetch(`/api/annotations/${annotId}/replies/${reply.id}`, {
              method: "PATCH", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ body, asName }),
            });
            setEditing(false); await reload();
          }}
        />
      ) : (
        <>
          <div className="body">{reply.body}</div>
          <div style={{ display: "flex", gap: ".7rem", marginTop: ".3rem" }}>
            <button className="reply-btn" onClick={onReply}>reply</button>
            {canEdit(user, reply.userId) && <button className="reply-btn" onClick={() => setEditing(true)}>edit</button>}
            {canEdit(user, reply.userId) && <button className="reply-btn" onClick={del}>delete</button>}
          </div>
        </>
      )}
    </div>
  );
}

function ReplyBox({ isAdmin, placeholder, onCancel, onSend }: {
  isAdmin: boolean; placeholder: string; onCancel: () => void; onSend: (body: string, asName?: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [asName, setAsName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ marginTop: ".8rem" }}>
      <textarea className="field" rows={3} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
      {isAdmin && <input className="field" style={{ marginTop: ".4rem" }} value={asName} onChange={(e) => setAsName(e.target.value)} placeholder="⚷ Reply as (admin) — optional" />}
      <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end", marginTop: ".5rem" }}>
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={async () => { setBusy(true); await onSend(text.trim(), asName.trim() || undefined); setBusy(false); }}>
          {busy ? "…" : "Reply"}
        </button>
      </div>
    </div>
  );
}

function EditBox({ initialBody, initialTags, initialAuthor, isAdmin, withTags, onCancel, onSave, onReanchor }: {
  initialBody: string; initialTags?: string; initialAuthor: string; isAdmin: boolean; withTags?: boolean;
  onCancel: () => void; onSave: (body: string, tags: string[] | undefined, asName?: string) => Promise<void>;
  onReanchor?: () => void;
}) {
  const [body, setBody] = useState(initialBody);
  const [tags, setTags] = useState(initialTags || "");
  const [asName, setAsName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ marginTop: ".5rem" }}>
      <textarea className="field" rows={5} autoFocus value={body} onChange={(e) => setBody(e.target.value)} />
      {withTags && <input className="field" style={{ marginTop: ".4rem" }} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, comma-separated" />}
      {isAdmin && <input className="field" style={{ marginTop: ".4rem" }} value={asName} onChange={(e) => setAsName(e.target.value)} placeholder={`⚷ Reassign author (admin) — currently ${initialAuthor}`} />}
      {onReanchor && (
        <button className="reply-btn" style={{ marginTop: ".6rem", display: "block" }} onClick={onReanchor}>
          ✎ Change highlighted region
        </button>
      )}
      <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end", marginTop: ".5rem" }}>
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={busy || !body.trim()} onClick={async () => {
          setBusy(true);
          await onSave(body.trim(), withTags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined, asName.trim() || undefined);
          setBusy(false);
        }}>{busy ? "…" : "Save"}</button>
      </div>
    </div>
  );
}
