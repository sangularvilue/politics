import Link from "next/link";
import { books, politics } from "@/lib/text";

export default function Home() {
  return (
    <div className="wrap">
      <section className="hero">
        <h1 className="greek-title">Aristotle&rsquo;s Politics</h1>
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
