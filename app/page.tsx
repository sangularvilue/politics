import Link from "next/link";
import { books, politics } from "@/lib/text";

export default function Home() {
  return (
    <div className="wrap">
      <section className="hero">
        <div className="greek-title">Πολιτικά</div>
        <div className="en-title">Aristotle&rsquo;s Politics</div>
        <div className="byline">
          translated by <b>Benjamin Jowett</b> · eight books
        </div>
        <p className="lede">
          The complete text of Aristotle&rsquo;s treatise on the city, the household, justice, and
          the best constitution &mdash; in the translation that has shaped English readers&rsquo;
          understanding of the work for over a century.
        </p>
      </section>

      <div className="eyebrow" style={{ textAlign: "center", marginBottom: ".5rem" }}>The Eight Books</div>
      <div className="book-grid">
        {books.map((b) => (
          <Link key={b.book} href={`/read/${b.book}/1`} className="book-card">
            <div className="num">{b.title.replace("Book ", "")}</div>
            <div className="bk-title">{b.title}</div>
            <div className="bk-theme">{b.theme}</div>
            <div className="bk-meta">
              <span>{b.chapters.length} ch.</span>
              <span className="mono">{b.bekker}</span>
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
