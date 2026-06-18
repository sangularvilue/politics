"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import type { Block } from "@/lib/types";

function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function EditableBlock({ block, isFirst, noteCount, onSaved }: {
  block: Block;
  isFirst: boolean;
  noteCount: number;
  onSaved: (id: string, text: string) => void;
}) {
  const [draft, setDraft] = useState(block.text);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const dirty = draft !== block.text;

  useEffect(() => { autoGrow(ref.current); }, []);
  // Keep the draft in sync when the saved text changes (e.g. after a save).
  useEffect(() => { setDraft(block.text); }, [block.text]);

  async function save() {
    if (!dirty || busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/admin/text", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId: block.id, text: draft }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || "Could not save."); return; }
      onSaved(block.id, j.text ?? draft);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch {
      setErr("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`para-edit${isFirst ? " first" : ""}${dirty ? " dirty" : ""}`}>
      <span className="pnum mono">{block.n}</span>
      <div className="pe-body">
        <textarea
          ref={ref}
          className="pe-area"
          value={draft}
          spellCheck
          aria-label={`Paragraph ${block.n}`}
          onChange={(e) => { setDraft(e.target.value); autoGrow(e.target); setErr(null); setSavedFlash(false); }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); save(); }
            if (e.key === "Escape") setDraft(block.text);
          }}
        />
        <div className="pe-actions">
          {noteCount > 0 && (
            <span className="pe-note" title="Comment highlights on this paragraph are realigned to your edit automatically">
              ⚑ {noteCount} highlight{noteCount === 1 ? "" : "s"} here
            </span>
          )}
          {err && <span className="pe-err">{err}</span>}
          {savedFlash && !dirty && <span className="pe-ok">Saved ✓</span>}
          {dirty && <button className="btn pe-revert" onClick={() => setDraft(block.text)} disabled={busy}>Revert</button>}
          <button className="btn btn-primary" onClick={save} disabled={!dirty || busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

export function EditableBlocks({ blocks, firstOfChapter, headings, noteCounts, onSaved }: {
  blocks: Block[];
  firstOfChapter: Set<number>;
  headings?: Record<number, { chapter: number }>;
  noteCounts: Record<string, number>;
  onSaved: (id: string, text: string) => void;
}) {
  return (
    <>
      {blocks.map((b, idx) => (
        <Fragment key={b.id}>
          {headings?.[idx] && <h2 className="inline-chapter">Chapter {headings[idx].chapter}</h2>}
          <EditableBlock block={b} isFirst={firstOfChapter.has(idx)} noteCount={noteCounts[b.id] || 0} onSaved={onSaved} />
        </Fragment>
      ))}
    </>
  );
}
