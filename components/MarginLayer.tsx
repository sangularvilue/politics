"use client";
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import type { Annotation } from "@/lib/types";

/**
 * Absolutely-positioned margin notes. Each card is placed at the vertical
 * position of its highlight's first <mark> (measured from the reading column),
 * then nudged down to avoid overlapping the previous card.
 */
export function MarginLayer({ notes, activeIds, onOpen, tagColorOf }: {
  notes: Annotation[];
  activeIds: string[];
  onOpen: (ids: string[]) => void;
  tagColorOf?: (a: Annotation) => string | null;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [tops, setTops] = useState<Record<string, number>>({});

  const measure = useCallback(() => {
    const layer = layerRef.current;
    const cont = layer?.parentElement;
    if (!layer || !cont) return;
    if (layer.offsetParent === null) return; // hidden (narrow screens)
    const contTop = cont.getBoundingClientRect().top;
    const desired = notes.map((a) => {
      const mark = cont.querySelector<HTMLElement>(`mark[data-annot-ids~="${a.id}"]`);
      return { id: a.id, top: mark ? mark.getBoundingClientRect().top - contTop : 0 };
    }).sort((x, y) => x.top - y.top);

    let prevBottom = -1e9;
    const out: Record<string, number> = {};
    for (const d of desired) {
      const el = layer.querySelector<HTMLElement>(`[data-card="${d.id}"]`);
      const h = el?.offsetHeight || 80;
      const t = Math.max(d.top, prevBottom + 10);
      out[d.id] = t;
      prevBottom = t + h;
    }
    setTops(out);
  }, [notes]);

  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    const cont = layerRef.current?.parentElement;
    if (!cont) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(cont);
    window.addEventListener("resize", measure);
    (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready?.then(() => measure());
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [measure]);

  return (
    <div className="margin-layer" ref={layerRef} aria-label="Comments">
      {notes.map((a) => {
        const dot = tagColorOf?.(a);
        const body = a.body.length > 150 ? a.body.slice(0, 150).trimEnd() + "…" : a.body;
        return (
          <button
            key={a.id}
            data-card={a.id}
            className={`margin-card${activeIds.includes(a.id) ? " active" : ""}`}
            style={{ top: tops[a.id] ?? 0, ...(dot ? { borderLeftColor: dot } : {}) }}
            onClick={() => onOpen([a.id])}
          >
            <div className="mc-who">{a.authorName}</div>
            <div className="mc-body">{body}</div>
            <div className="mc-foot">
              {a.replyCount > 0 && <span>{a.replyCount} repl{a.replyCount === 1 ? "y" : "ies"}</span>}
              {a.tags.slice(0, 2).map((t) => <span key={t} className="mc-tag">#{t}</span>)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
