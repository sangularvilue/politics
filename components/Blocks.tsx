"use client";
import { Fragment } from "react";
import type { Block } from "@/lib/types";

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

export function Blocks({ blocks, rangesByBlock, activeIds, onMarkClick, firstOfChapter, headings }: {
  blocks: Block[];
  rangesByBlock: Record<string, Range3[]>;
  activeIds: string[];
  onMarkClick: (ids: string[]) => void;
  firstOfChapter: Set<number>;
  headings?: Record<number, { chapter: number }>;
}) {
  return (
    <>
      {blocks.map((b, idx) => {
        const segs = segmentBlock(b.text, rangesByBlock[b.id] || []);
        const heading = headings?.[idx];
        return (
          <Fragment key={b.id}>
            {heading && <h2 className="inline-chapter">Chapter {heading.chapter}</h2>}
            <div className={`para${firstOfChapter.has(idx) ? " first" : ""}`}>
              <span className="pnum mono">{b.n}</span>
              <div className="ptext" data-block-id={b.id} data-block-idx={idx}>
                {segs.map((s, i) =>
                  s.ids.length ? (
                    <mark
                      key={i}
                      className={`${s.mine ? "mine" : ""} ${s.ids.some((id) => activeIds.includes(id)) ? "active" : ""}`}
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
          </Fragment>
        );
      })}
    </>
  );
}
