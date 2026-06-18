"use client";
import { Fragment, useRef, useState } from "react";
import type { Block, Annotation } from "@/lib/types";

export interface Range3 { start: number; end: number; id: string; mine: boolean }
interface Seg { text: string; ids: string[]; mine: boolean }

type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * The same `.ptext` paragraph, but contentEditable — so the layout stays
 * pixel-identical to the reading view and only the text becomes editable.
 * Saves on blur (Esc reverts, ⌘/Ctrl+Enter commits). Text is kept as a stable
 * single node so React never clobbers an in-progress edit.
 */
function EditableText({ block, onSave }: { block: Block; onSave: (id: string, text: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const original = block.text;

  async function commit() {
    const el = ref.current;
    if (!el) return;
    const next = el.innerText.replace(/\s+/g, " ").trim();
    if (next === original) { el.innerText = original; setStatus("idle"); return; }
    if (!next) { el.innerText = original; setStatus("idle"); return; } // never save empty
    setStatus("saving");
    try {
      const r = await fetch("/api/admin/text", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId: block.id, text: next }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setStatus("error"); return; }   // keep the edit so it isn't lost
      onSave(block.id, j.text ?? next);
      setStatus("saved");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1600);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      ref={ref}
      className="ptext editing"
      data-block-id={block.id}
      data-status={status}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      role="textbox"
      aria-label={`Edit paragraph ${block.n}`}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); if (ref.current) ref.current.innerText = original; ref.current?.blur(); }
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); ref.current?.blur(); }
      }}
    >
      {original}
    </div>
  );
}

function segmentBlock(text: string, ranges: Range3[]): Seg[] {
  if (!ranges.length) return [{ text, ids: [], mine: false }];
  const points = new Set<number>([0, text.length]);
  for (const r of ranges) { points.add(Math.max(0, r.start)); points.add(Math.min(text.length, r.end)); }
  const sorted = [...points].sort((a, b) => a - b);
  const segs: Seg[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const s = sorted[i], e = sorted[i + 1];
    if (s >= e) continue;
    const covering = ranges.filter((r) => r.start <= s && r.end >= e);
    segs.push({ text: text.slice(s, e), ids: covering.map((r) => r.id), mine: covering.some((r) => r.mine) });
  }
  return segs;
}

export function Blocks({
  blocks, rangesByBlock, activeIds, onMarkClick, firstOfChapter, headings,
  showComments, notesByBlock, onOpen, commentStyle, inlineOpenId, renderInlineThread, tagColorOf, markColor,
  editing, onSaveBlock,
}: {
  blocks: Block[];
  rangesByBlock: Record<string, Range3[]>;
  activeIds: string[];
  onMarkClick: (ids: string[]) => void;
  firstOfChapter: Set<number>;
  headings?: Record<number, { chapter: number }>;
  showComments: boolean;
  notesByBlock: Record<string, Annotation[]>;
  onOpen: (ids: string[]) => void;
  commentStyle: "margin" | "inline" | "sidebar";
  inlineOpenId?: string | null;
  renderInlineThread?: (id: string) => React.ReactNode;
  tagColorOf?: (a: Annotation) => string | null;
  markColor?: (ids: string[]) => string | undefined;
  editing?: boolean;
  onSaveBlock?: (id: string, text: string) => void;
}) {
  return (
    <>
      {blocks.map((b, idx) => {
        const segs = segmentBlock(b.text, showComments && !editing ? (rangesByBlock[b.id] || []) : []);
        const heading = headings?.[idx];
        const notes = showComments && !editing ? (notesByBlock[b.id] || []) : [];
        return (
          <Fragment key={b.id}>
            {heading && <h2 className="inline-chapter">Chapter {heading.chapter}</h2>}
            <div className="para-row">
              <div className={`para${firstOfChapter.has(idx) ? " first" : ""}`}>
                <span className="pnum mono">{b.n}</span>
                {editing && onSaveBlock ? (
                  <EditableText block={b} onSave={onSaveBlock} />
                ) : (
                <div className="ptext" data-block-id={b.id} data-block-idx={idx}>
                  {segs.map((s, i) =>
                    s.ids.length ? (
                      <mark
                        key={i}
                        data-annot-ids={s.ids.join(" ")}
                        className={`${s.mine ? "mine" : ""} ${s.ids.some((id) => activeIds.includes(id)) ? "active" : ""}`}
                        style={markColor?.(s.ids) ? { background: markColor(s.ids) } : undefined}
                        onClick={(e) => { e.stopPropagation(); onMarkClick(s.ids); }}
                      >
                        {s.text}
                      </mark>
                    ) : (
                      <span key={i}>{s.text}</span>
                    )
                  )}
                </div>
                )}
              </div>
            </div>
            {commentStyle === "inline" && notes.length > 0 && (
              <div className="inline-notes">
                {notes.map((a) => (
                  inlineOpenId === a.id
                    ? <div className="inline-thread" key={a.id}>{renderInlineThread?.(a.id)}</div>
                    : <button className="inline-note-bar" key={a.id} onClick={() => onOpen([a.id])}>
                        <span className="dot" style={tagColorOf?.(a) ? { background: tagColorOf(a)! } : undefined} />
                        <span className="inb-who">{a.authorName}</span>
                        <span className="inb-prev">{a.body.length > 90 ? a.body.slice(0, 90) + "…" : a.body}</span>
                        {a.replyCount > 0 && <span className="inb-count">{a.replyCount}</span>}
                      </button>
                ))}
              </div>
            )}
          </Fragment>
        );
      })}
    </>
  );
}
