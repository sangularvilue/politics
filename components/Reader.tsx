"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import type { Annotation, Anchor, Block, PublicUser } from "@/lib/types";
import { CommentPanel } from "./CommentPanel";

interface Props {
  book: number;
  chapter: number;
  blocks: Block[];
  initialAnnotations: Annotation[];
  user: PublicUser | null;
  openId?: string;
}

interface Range3 { start: number; end: number; id: string; mine: boolean }
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

/** char offset from the start of blockEl to (node, offset). */
function offsetWithin(blockEl: HTMLElement, node: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(blockEl);
  r.setEnd(node, offset);
  return r.toString().length;
}

export function Reader({ book, chapter, blocks, initialAnnotations, user, openId }: Props) {
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [toolbar, setToolbar] = useState<{ x: number; y: number; anchors: Anchor[]; quote: string } | null>(null);
  const [panel, setPanel] = useState<
    | { mode: "create"; anchors: Anchor[]; quote: string }
    | { mode: "view"; ids: string[] }
    | null
  >(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setAnnotations(initialAnnotations); }, [initialAnnotations]);

  // Deep-link: open a specific annotation and scroll its passage into view.
  useEffect(() => {
    if (!openId) return;
    const a = initialAnnotations.find((x) => x.id === openId);
    if (!a) return;
    setPanel({ mode: "view", ids: [openId] });
    const el = document.querySelector<HTMLElement>(`[data-block-id="${a.anchors[0]?.blockId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  const refresh = useCallback(async () => {
    const r = await fetch(`/api/annotations?book=${book}&chapter=${chapter}`);
    const j = await r.json();
    setAnnotations(j.annotations || []);
  }, [book, chapter]);

  // Build per-block ranges from anchors.
  const rangesByBlock: Record<string, Range3[]> = {};
  for (const a of annotations) {
    for (const an of a.anchors) {
      (rangesByBlock[an.blockId] ||= []).push({
        start: an.start, end: an.end, id: a.id, mine: !!user && a.userId === user.id,
      });
    }
  }

  const onMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setToolbar(null); return; }
    const range = sel.getRangeAt(0);
    const startEl = (range.startContainer.parentElement as HTMLElement)?.closest<HTMLElement>("[data-block-id]");
    const endEl = (range.endContainer.parentElement as HTMLElement)?.closest<HTMLElement>("[data-block-id]");
    if (!startEl || !endEl || !containerRef.current?.contains(startEl)) { setToolbar(null); return; }

    const startIdx = Number(startEl.dataset.blockIdx);
    const endIdx = Number(endEl.dataset.blockIdx);
    const [lo, hi] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    const lowEl = lo === startIdx ? startEl : endEl;
    const highEl = hi === endIdx ? endEl : startEl;
    const lowOff = offsetWithin(lowEl, lo === startIdx ? range.startContainer : range.endContainer, lo === startIdx ? range.startOffset : range.endOffset);
    const highOff = offsetWithin(highEl, hi === endIdx ? range.endContainer : range.startContainer, hi === endIdx ? range.endOffset : range.startOffset);

    const anchors: Anchor[] = [];
    for (let i = lo; i <= hi; i++) {
      const b = blocks[i];
      const s = i === lo ? lowOff : 0;
      const e = i === hi ? highOff : b.text.length;
      if (e > s) anchors.push({ blockId: b.id, start: s, end: e });
    }
    const quote = sel.toString().replace(/\s+/g, " ").trim();
    if (!anchors.length || !quote) { setToolbar(null); return; }

    const rect = range.getBoundingClientRect();
    const host = containerRef.current.getBoundingClientRect();
    setToolbar({
      x: rect.left - host.left + rect.width / 2,
      y: rect.top - host.top - 8,
      anchors, quote,
    });
  }, [blocks]);

  function openCreate() {
    if (!toolbar) return;
    if (!user) { window.location.href = `/login?next=${encodeURIComponent(location.pathname)}`; return; }
    setPanel({ mode: "create", anchors: toolbar.anchors, quote: toolbar.quote });
    setToolbar(null);
    window.getSelection()?.removeAllRanges();
  }

  function openView(ids: string[]) {
    if (!ids.length) return;
    setPanel({ mode: "view", ids });
  }

  const activeIds = panel?.mode === "view" ? panel.ids : [];

  return (
    <div ref={containerRef} style={{ position: "relative" }} onMouseUp={onMouseUp}>
      {blocks.map((b, idx) => {
        const segs = segmentBlock(b.text, rangesByBlock[b.id] || []);
        return (
          <div className={`para${idx === 0 ? " first" : ""}`} key={b.id}>
            <div className="pnum mono">{b.n}</div>
            <div className="ptext" data-block-id={b.id} data-block-idx={idx}>
              {segs.map((s, i) =>
                s.ids.length ? (
                  <mark
                    key={i}
                    className={`${s.mine ? "mine" : ""} ${s.ids.some((id) => activeIds.includes(id)) ? "active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); openView(s.ids); }}
                  >
                    {s.text}
                  </mark>
                ) : (
                  <span key={i}>{s.text}</span>
                )
              )}
            </div>
          </div>
        );
      })}

      {toolbar && (
        <button className="sel-toolbar" style={{ left: toolbar.x, top: toolbar.y }} onMouseDown={(e) => e.preventDefault()} onClick={openCreate}>
          ✎ Annotate
        </button>
      )}

      {panel && (
        <CommentPanel
          book={book}
          chapter={chapter}
          mode={panel.mode}
          anchors={panel.mode === "create" ? panel.anchors : []}
          quote={panel.mode === "create" ? panel.quote : ""}
          ids={panel.mode === "view" ? panel.ids : []}
          annotations={annotations}
          user={user}
          onClose={() => setPanel(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}
