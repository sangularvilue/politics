"use client";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import type { Annotation, Anchor, Block, Book, PublicUser } from "@/lib/types";
import { Blocks, type Range3 } from "./Blocks";
import { PagedView } from "./PagedView";
import { CommentPanel } from "./CommentPanel";
import { selectionToAnchors, parseBlockId } from "@/lib/selection";

type Mode = "chapter" | "scroll" | "page";
interface Ref2 { book: number; chapter: number }

interface Props {
  book: Book;
  currentChapter: number;
  prev: Ref2 | null;
  next: Ref2 | null;
  initialAnnotations: Annotation[];
  user: PublicUser | null;
  openId?: string;
  focusBlockId?: string;
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export function Reader({ book, currentChapter, prev, next, initialAnnotations, user, openId, focusBlockId }: Props) {
  const [mode, setMode] = useState<Mode>("chapter");
  const [showComments, setShowComments] = useState(true);
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [toolbar, setToolbar] = useState<{ x: number; y: number; anchors: Anchor[]; quote: string } | null>(null);
  const [panel, setPanel] = useState<
    | { mode: "create"; book: number; chapter: number; anchors: Anchor[]; quote: string }
    | { mode: "view"; ids: string[] }
    | null
  >(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef<Block[]>([]);

  useEffect(() => { setAnnotations(initialAnnotations); }, [initialAnnotations]);
  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem("pol-readmode")) as Mode | null;
    if (saved === "chapter" || saved === "scroll" || saved === "page") setMode(saved);
    try { if (localStorage.getItem("pol-comments") === "off") setShowComments(false); } catch {}
    const onR = () => setIsMobile(window.innerWidth < 640);
    onR(); window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  function changeMode(m: Mode) { setMode(m); setToolbar(null); try { localStorage.setItem("pol-readmode", m); } catch {} }
  function toggleComments() { setShowComments((v) => { const nv = !v; try { localStorage.setItem("pol-comments", nv ? "on" : "off"); } catch {} return nv; }); }

  const refresh = useCallback(async () => {
    const r = await fetch(`/api/annotations?book=${book.book}`);
    const j = await r.json();
    setAnnotations(j.annotations || []);
  }, [book.book]);

  // ----- build the flat block list for the active mode -----
  const view = useMemo(() => {
    if (mode === "chapter") {
      const ch = book.chapters.find((c) => c.chapter === currentChapter);
      const blocks = ch ? ch.blocks : [];
      return { blocks, firstOfChapter: new Set<number>(blocks.length ? [0] : []), headings: {} as Record<number, { chapter: number }> };
    }
    const blocks: Block[] = [];
    const firstOfChapter = new Set<number>();
    const headings: Record<number, { chapter: number }> = {};
    for (const ch of book.chapters) {
      firstOfChapter.add(blocks.length);
      headings[blocks.length] = { chapter: ch.chapter };
      blocks.push(...ch.blocks);
    }
    return { blocks, firstOfChapter, headings };
  }, [mode, book, currentChapter]);

  renderedRef.current = view.blocks;

  const rangesByBlock = useMemo(() => {
    const map: Record<string, Range3[]> = {};
    for (const a of annotations) for (const an of a.anchors) {
      (map[an.blockId] ||= []).push({ start: an.start, end: an.end, id: a.id, mine: !!user && a.userId === user.id });
    }
    return map;
  }, [annotations, user]);

  // group annotations under the paragraph where their highlight begins (for the margin)
  const notesByBlock = useMemo(() => {
    const map: Record<string, Annotation[]> = {};
    for (const a of annotations) {
      const first = a.anchors[0]?.blockId;
      if (first) (map[first] ||= []).push(a);
    }
    for (const k in map) map[k].sort((x, y) => x.createdAt - y.createdAt);
    return map;
  }, [annotations]);

  // ----- selection (mouse + touch) -----
  const evaluate = useCallback(() => {
    if (!containerRef.current) return;
    const res = selectionToAnchors(containerRef.current, renderedRef.current);
    if (!res) { setToolbar(null); return; }
    setToolbar({ x: res.rect.left + res.rect.width / 2, y: res.rect.top, anchors: res.anchors, quote: res.quote });
  }, []);

  useEffect(() => {
    const onUp = () => setTimeout(evaluate, 0);
    let t: ReturnType<typeof setTimeout>;
    const onSel = () => { clearTimeout(t); t = setTimeout(evaluate, 350); };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    document.addEventListener("selectionchange", onSel);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
      document.removeEventListener("selectionchange", onSel);
      clearTimeout(t);
    };
  }, [evaluate]);

  function openCreate() {
    if (!toolbar) return;
    if (!user) { window.location.href = `/login?next=${encodeURIComponent(location.pathname)}`; return; }
    const meta = parseBlockId(toolbar.anchors[0].blockId);
    if (!meta) return;
    setPanel({ mode: "create", book: meta.book, chapter: meta.chapter, anchors: toolbar.anchors, quote: toolbar.quote });
    setToolbar(null);
    window.getSelection()?.removeAllRanges();
  }

  function openView(ids: string[]) { if (ids.length) setPanel({ mode: "view", ids }); }
  const activeIds = panel?.mode === "view" ? panel.ids : [];

  // deep link
  const jumpedRef = useRef(false);
  useEffect(() => {
    if (jumpedRef.current || !openId) return;
    const a = initialAnnotations.find((x) => x.id === openId);
    if (!a) return;
    jumpedRef.current = true;
    setPanel({ mode: "view", ids: [openId] });
    setTimeout(() => {
      document.querySelector<HTMLElement>(`[data-block-id="${a.anchors[0]?.blockId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  }, [openId, initialAnnotations]);

  // jump to a passage from a text search result, and flash it
  const flashedRef = useRef(false);
  useEffect(() => {
    if (flashedRef.current || !focusBlockId) return;
    const t = setTimeout(() => {
      const ptext = document.querySelector<HTMLElement>(`[data-block-id="${focusBlockId}"]`);
      const para = ptext?.closest<HTMLElement>(".para");
      if (!ptext) return;
      flashedRef.current = true;
      ptext.scrollIntoView({ behavior: "smooth", block: "center" });
      para?.classList.add("focus-flash");
      setTimeout(() => para?.classList.remove("focus-flash"), 2600);
    }, 200);
    return () => clearTimeout(t);
  }, [focusBlockId, mode]);

  // scroll to current chapter when entering scroll mode
  useEffect(() => {
    if (mode !== "scroll") return;
    const id = book.chapters.find((c) => c.chapter === currentChapter)?.blocks[0]?.id;
    if (!id || currentChapter === 1) return;
    setTimeout(() => document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)?.scrollIntoView({ block: "start" }), 60);
  }, [mode, book, currentChapter]);

  const blocksEl = (
    <Blocks blocks={view.blocks} rangesByBlock={rangesByBlock} activeIds={activeIds}
      onMarkClick={openView} firstOfChapter={view.firstOfChapter} headings={view.headings}
      showComments={showComments} notesByBlock={notesByBlock} onOpen={openView} />
  );

  const jumpId = book.chapters.find((c) => c.chapter === currentChapter)?.blocks[0]?.id;

  return (
    <div className="reader-area" data-mode={mode} data-comments={showComments ? "on" : "off"}>
      <div className="reader-bar">
        <div className="rt-label">
          <Link href="/browse">{book.title}</Link>
          {mode === "chapter" && <> · Chapter {currentChapter}</>}
          <span className="mono rt-bekker"> · Bekker {book.bekker}</span>
        </div>
        <button
          className={`comments-toggle${showComments ? " active" : ""}`}
          onClick={toggleComments}
          aria-pressed={showComments}
          title={showComments ? "Hide comments" : "Show comments"}
        >
          💬 {showComments ? "Comments on" : "Comments off"}
        </button>
        <div className="mode-switch" role="tablist" aria-label="Reading mode">
          {([["chapter", "Chapter"], ["scroll", "Scroll"], ["page", "Pages"]] as [Mode, string][]).map(([m, label]) => (
            <button key={m} className={mode === m ? "active" : ""} onClick={() => changeMode(m)} aria-pressed={mode === m}>{label}</button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="reader-content">
        {mode === "chapter" && (
          <div className="reader-col">
            <header className="chapter-head">
              <div className="bk">{book.title} · Chapter {currentChapter}</div>
              <h1>Chapter {currentChapter}</h1>
              {currentChapter === 1 && <div className="theme">{book.theme}</div>}
              <div className="bekker">Bekker {book.bekker} · cite as {ROMAN[book.book]}.{currentChapter}.¶</div>
            </header>
            {blocksEl}
            <nav className="chapter-nav">
              {prev ? <Link href={`/read/${prev.book}/${prev.chapter}`}><span className="lbl">Previous</span>{ROMAN[prev.book]}. Chapter {prev.chapter}</Link> : <span />}
              {next ? <Link href={`/read/${next.book}/${next.chapter}`} style={{ textAlign: "right" }}><span className="lbl">Next</span>{ROMAN[next.book]}. Chapter {next.chapter}</Link> : <span />}
            </nav>
          </div>
        )}

        {mode === "scroll" && (
          <div className="reader-col">
            <header className="chapter-head"><div className="bk">{book.title}</div><h1>{book.title}</h1><div className="theme">{book.theme}</div><div className="bekker">Bekker {book.bekker}</div></header>
            {blocksEl}
          </div>
        )}

        {mode === "page" && <PagedView jumpToBlockId={jumpId}>{blocksEl}</PagedView>}
      </div>

      {toolbar && (
        <button
          className={isMobile ? "sel-toolbar mobile" : "sel-toolbar"}
          style={isMobile ? undefined : { left: toolbar.x, top: toolbar.y }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={openCreate}
        >
          ✎ Annotate
        </button>
      )}

      {panel && (
        <CommentPanel
          book={panel.mode === "create" ? panel.book : book.book}
          chapter={panel.mode === "create" ? panel.chapter : currentChapter}
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
