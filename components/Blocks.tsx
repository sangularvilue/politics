"use client";
import { Fragment } from "react";
import type { Block, Annotation } from "@/lib/types";

export interface Range3 { start: number; end: number; id: string; mine: boolean }
interface Seg { text: string; ids: string[]; mine: boolean }

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

function MarginCard({ a, active, onOpen, dot }: { a: Annotation; active: boolean; onOpen: () => void; dot?: string | null }) {
  const body = a.body.length > 150 ? a.body.slice(0, 150).trimEnd() + "…" : a.body;
  return (
    <button className={`margin-card${active ? " active" : ""}`} onClick={onOpen} style={dot ? { borderLeftColor: dot } : undefined}>
      <div className="mc-who">{a.authorName}</div>
      <div className="mc-body">{body}</div>
      <div className="mc-foot">
        {a.replyCount > 0 && <span>{a.replyCount} repl{a.replyCount === 1 ? "y" : "ies"}</span>}
        {a.tags.slice(0, 2).map((t) => <span key={t} className="mc-tag">#{t}</span>)}
      </div>
    </button>
  );
}

export function Blocks({
  blocks, rangesByBlock, activeIds, onMarkClick, firstOfChapter, headings,
  showComments, notesByBlock, onOpen, commentStyle, inlineOpenId, renderInlineThread, tagColorOf, markColor,
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
}) {
  return (
    <>
      {blocks.map((b, idx) => {
        const segs = segmentBlock(b.text, showComments ? (rangesByBlock[b.id] || []) : []);
        const heading = headings?.[idx];
        const notes = showComments ? (notesByBlock[b.id] || []) : [];
        return (
          <Fragment key={b.id}>
            {heading && <h2 className="inline-chapter">Chapter {heading.chapter}</h2>}
            <div className="para-row">
              <div className={`para${firstOfChapter.has(idx) ? " first" : ""}`}>
                <span className="pnum mono">{b.n}</span>
                <div className="ptext" data-block-id={b.id} data-block-idx={idx}>
                  {segs.map((s, i) =>
                    s.ids.length ? (
                      <mark
                        key={i}
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
              </div>
              {commentStyle === "margin" && notes.length > 0 && (
                <div className="margin-col">
                  {notes.map((a) => (
                    <MarginCard key={a.id} a={a} active={activeIds.includes(a.id)} onOpen={() => onOpen([a.id])} dot={tagColorOf?.(a)} />
                  ))}
                </div>
              )}
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
