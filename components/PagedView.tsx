"use client";
import { useRef, useState, useLayoutEffect, useEffect, useCallback } from "react";

export function PagedView({ children, jumpToBlockId }: { children: React.ReactNode; jumpToBlockId?: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [cols, setCols] = useState(1);
  const [step, setStep] = useState(0); // px advanced per page = viewport width
  const jumpedRef = useRef(false);

  const measure = useCallback(() => {
    const vp = viewportRef.current, ct = contentRef.current;
    if (!vp || !ct) return;
    // A "page" advances by the content width PLUS one column-gap, because CSS
    // multicol places a gap between every column (including across page breaks).
    // Using width alone drifts by one gap per turn.
    const gap = parseFloat(getComputedStyle(ct).columnGap) || 0;
    const w = ct.clientWidth;
    const s = w + gap;
    setStep(s);
    const total = Math.max(1, Math.round((ct.scrollWidth + gap) / s));
    setPages(total);
    setPage((p) => Math.min(p, total - 1));
  }, []);

  // column count by available width
  useLayoutEffect(() => {
    const onResize = () => setCols(window.innerWidth >= 900 ? 2 : 1);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useLayoutEffect(() => { measure(); }, [measure, cols, children]);

  useEffect(() => {
    const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
    fonts?.ready?.then(() => measure());
    const ro = new ResizeObserver(() => measure());
    if (viewportRef.current) ro.observe(viewportRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // jump to the page that contains the current chapter, once measured
  useLayoutEffect(() => {
    if (jumpedRef.current || !jumpToBlockId || !step) return;
    const el = contentRef.current?.querySelector<HTMLElement>(`[data-block-id="${jumpToBlockId}"]`);
    const ct = contentRef.current;
    if (el && ct) {
      const left = el.getBoundingClientRect().left - ct.getBoundingClientRect().left;
      setPage(Math.max(0, Math.floor((left + 2) / step)));
      jumpedRef.current = true;
    }
  }, [jumpToBlockId, step, pages]);

  const go = useCallback((d: number) => setPage((p) => Math.max(0, Math.min(pages - 1, p + d))), [pages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // swipe — but never when the user has just made a text selection
  const touch = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touch.current) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return; // user was selecting text
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
    touch.current = null;
  }

  return (
    <div className="paged-wrap">
      <div className="paged-viewport" ref={viewportRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div
          className="paged-content"
          ref={contentRef}
          style={{ columnCount: cols, transform: `translateX(${-page * step}px)` }}
        >
          {children}
        </div>
      </div>
      <div className="paged-controls">
        <button className="btn" onClick={() => go(-1)} disabled={page <= 0} aria-label="Previous page">‹ Prev</button>
        <span className="mono pageind">{page + 1} / {pages}</span>
        <button className="btn" onClick={() => go(1)} disabled={page >= pages - 1} aria-label="Next page">Next ›</button>
      </div>
    </div>
  );
}
