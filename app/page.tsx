import Link from "next/link";
import { books, politics } from "@/lib/text";
import { redis, idxBook, idxAll } from "@/lib/redis";

export const dynamic = "force-dynamic";

async function bookCounts(): Promise<{ counts: number[]; total: number }> {
  const p = redis.pipeline();
  for (const b of books) p.zcard(idxBook(b.book));
  p.zcard(idxAll());
  const res = (await p.exec()) as number[];
  return { counts: res.slice(0, books.length), total: res[books.length] || 0 };
}

export default async function Home() {
  const { counts, total } = await bookCounts();

  return (
    <div className="wrap">
      <section className="hero">
        <div className="greek-title">Πολιτικά</div>
        <div className="en-title">The Politics of Aristotle</div>
        <div className="byline">
          translated by <b>Benjamin Jowett</b> · eight books, {total} annotation{total === 1 ? "" : "s"} and counting
        </div>
        <p className="lede">
          The complete text, read passage by passage. Highlight a sentence to leave a question or
          a gloss; reply to others; and follow the argument through the marginalia of everyone
          reading alongside you.
        </p>
      </section>

      <div className="eyebrow" style={{ textAlign: "center", marginBottom: ".5rem" }}>The Eight Books</div>
      <div className="book-grid">
        {books.map((b, i) => (
          <Link key={b.book} href={`/read/${b.book}/1`} className="book-card">
            <div className="num">{b.title.replace("Book ", "")}</div>
            <div className="bk-title">{b.title}</div>
            <div className="bk-theme">{b.theme}</div>
            <div className="bk-meta">
              <span>{b.chapters.length} ch.</span>
              <span className="mono">{b.bekker}</span>
              {counts[i] > 0 && <span className="cmt">{counts[i]} note{counts[i] === 1 ? "" : "s"}</span>}
            </div>
          </Link>
        ))}
      </div>

      <p className="muted" style={{ marginTop: "3rem", fontSize: ".8rem", textAlign: "center" }}>
        {politics.meta.note}
      </p>
    </div>
  );
}
