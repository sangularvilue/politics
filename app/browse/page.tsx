import Link from "next/link";
import { books } from "@/lib/text";
import { redis, idxChapter } from "@/lib/redis";
import { BrowseTabs } from "@/components/BrowseTabs";

export const dynamic = "force-dynamic";

export default async function BrowseBooks() {
  // counts per chapter
  const p = redis.pipeline();
  const refs: { book: number; chapter: number }[] = [];
  for (const b of books) for (const c of b.chapters) { refs.push({ book: b.book, chapter: c.chapter }); p.zcard(idxChapter(b.book, c.chapter)); }
  const counts = (await p.exec()) as number[];
  const countOf = (bk: number, ch: number) => counts[refs.findIndex((r) => r.book === bk && r.chapter === ch)] || 0;

  return (
    <div className="wrap">
      <h1 style={{ fontSize: "2rem", marginBottom: ".3rem" }}>Browse</h1>
      <p className="muted" style={{ marginBottom: "1.5rem" }}>Move through the work by book and chapter, or by tag and author.</p>
      <BrowseTabs active="books" />

      {books.map((b) => (
        <section key={b.book} style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: ".8rem", marginBottom: ".8rem" }}>
            <h2 style={{ fontSize: "1.4rem" }}>{b.title}</h2>
            <span className="muted" style={{ fontStyle: "italic", fontFamily: "var(--font-serif)" }}>{b.theme}</span>
            <span className="mono" style={{ fontSize: ".7rem", color: "var(--ink-ghost)", marginLeft: "auto" }}>{b.bekker}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))", gap: ".5rem" }}>
            {b.chapters.map((c) => {
              const n = countOf(b.book, c.chapter);
              return (
                <Link key={c.chapter} href={`/read/${b.book}/${c.chapter}`} className="list-item" style={{ margin: 0, padding: ".7rem .9rem" }}>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: "1rem" }}>Ch. {c.chapter}</div>
                  <div className="mono" style={{ fontSize: ".68rem", color: n ? "var(--accent)" : "var(--ink-ghost)", marginTop: ".2rem" }}>
                    {n ? `${n} note${n === 1 ? "" : "s"}` : `${c.blocks.length} ¶`}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
