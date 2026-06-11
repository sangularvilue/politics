"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface PassageHit { book: number; chapter: number; blockId: string; n: number; snippet: string; cite: string }
interface BekkerHit { book: number; title: string; theme: string; range: string; page: string }
interface CommentHit { annotationId: string; book: number; chapter: number; authorName: string; kind: string; snippet: string; cite: string }
interface Results { q: string; bekker: BekkerHit | null; passages: PassageHit[]; comments: CommentHit[] }

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const out: React.ReactNode[] = [];
  const lower = text.toLowerCase(), ql = q.toLowerCase();
  let i = 0, idx: number;
  while ((idx = lower.indexOf(ql, i)) >= 0) {
    if (idx > i) out.push(text.slice(i, idx));
    out.push(<mark key={idx} className="hl">{text.slice(idx, idx + q.length)}</mark>);
    i = idx + q.length;
  }
  out.push(text.slice(i));
  return <>{out}</>;
}

const KIND_LABEL: Record<string, string> = { comment: "comment", reply: "reply", quote: "on a highlight", tag: "tag" };

export function SearchView() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") || "");
  const [res, setRes] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const run = useCallback(async (query: string) => {
    if (query.trim().length < 2) { setRes(null); return; }
    setLoading(true);
    const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    setRes(await r.json());
    setLoading(false);
  }, []);

  // debounced search + shareable URL
  useEffect(() => {
    const t = setTimeout(() => {
      run(q);
      const url = q.trim() ? `/search?q=${encodeURIComponent(q)}` : "/search";
      window.history.replaceState(null, "", url);
    }, 280);
    return () => clearTimeout(t);
  }, [q, run]);

  const total = res ? (res.bekker ? 1 : 0) + res.passages.length + res.comments.length : 0;

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: "2rem", marginBottom: ".3rem" }}>Search</h1>
      <p className="muted" style={{ marginBottom: "1.4rem" }}>The text, a Bekker number (e.g. 1280b), a tag, or anything in the discussion.</p>

      <input
        ref={inputRef}
        className="field search-field"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search Aristotle’s Politics…"
        aria-label="Search"
      />

      {q.trim().length >= 2 && (
        <div className="muted" style={{ margin: "1rem 0 .5rem", fontSize: ".85rem" }}>
          {loading ? "Searching…" : `${total} result${total === 1 ? "" : "s"} for “${q.trim()}”`}
        </div>
      )}

      {res?.bekker && (
        <section style={{ marginBottom: "1.6rem" }}>
          <div className="search-section">Bekker reference</div>
          <Link href={`/read/${res.bekker.book}/1`} className="list-item">
            <div className="cite">{res.bekker.page} · falls within {res.bekker.range}</div>
            <div className="b" style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem" }}>{res.bekker.title}</div>
            <div className="q" style={{ fontStyle: "italic" }}>{res.bekker.theme}</div>
          </Link>
        </section>
      )}

      {res && res.passages.length > 0 && (
        <section style={{ marginBottom: "1.6rem" }}>
          <div className="search-section">In the text · {res.passages.length}</div>
          {res.passages.map((p) => (
            <Link key={p.blockId} href={`/read/${p.book}/${p.chapter}?b=${p.blockId}`} className="list-item">
              <div className="cite">Politics {p.cite}</div>
              <div className="b" style={{ fontFamily: "var(--font-serif)" }}><Highlight text={p.snippet} q={res.q} /></div>
            </Link>
          ))}
        </section>
      )}

      {res && res.comments.length > 0 && (
        <section style={{ marginBottom: "1.6rem" }}>
          <div className="search-section">In the discussion · {res.comments.length}</div>
          {res.comments.map((c, i) => (
            <Link key={c.annotationId + i} href={`/read/${c.book}/${c.chapter}?a=${c.annotationId}`} className="list-item">
              <div className="cite">Politics {c.cite} · {KIND_LABEL[c.kind] || c.kind}</div>
              <div className="b" style={{ fontFamily: "var(--font-serif)" }}><Highlight text={c.snippet} q={res.q} /></div>
              <div className="ft"><span>{c.authorName}</span></div>
            </Link>
          ))}
        </section>
      )}

      {res && total === 0 && !loading && (
        <p className="empty">Nothing found for “{res.q}”. Try a different word or a Bekker number.</p>
      )}
    </div>
  );
}
