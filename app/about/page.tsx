import Link from "next/link";
import { politics } from "@/lib/text";

export const metadata = { title: "About — Politics" };

export default function AboutPage() {
  return (
    <div className="wrap" style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: "2.4rem", marginBottom: "1rem" }}>About this edition</h1>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.12rem", lineHeight: 1.8, color: "var(--ink-soft)" }}>
        <p>
          This is the complete text of Aristotle&rsquo;s <i>Politics</i> in the translation of
          {" "}<b style={{ color: "var(--ink)" }}>Benjamin Jowett</b> (1885), the version that shaped how
          generations of English readers have met the work. Eight books, in their traditional
          chapter divisions, each paragraph numbered for citation.
        </p>
        <h3 style={{ fontFamily: "var(--font-serif)", marginTop: "2rem", color: "var(--ink)" }}>How to annotate</h3>
        <p>
          Select any passage and a small <b style={{ color: "var(--ink)" }}>✎ Annotate</b> button appears.
          Leave a note, a question, or a gloss; add tags so others can find it by theme. Anyone can read;
          to highlight or reply you&rsquo;ll <Link href="/register" style={{ color: "var(--accent)" }}>create an account</Link>.
          Conversations thread beneath each highlight.
        </p>
        <h3 style={{ fontFamily: "var(--font-serif)", marginTop: "2rem", color: "var(--ink)" }}>On the numbering</h3>
        <p>
          Scholars cite the <i>Politics</i> by <b style={{ color: "var(--ink)" }}>Bekker number</b> — the
          page, column, and line of the 1831 Greek edition (e.g. 1252a). Those line numbers are keyed to the
          Greek and cannot be placed precisely within any English prose translation, so this edition gives the
          Bekker page-range for each book and uses <b style={{ color: "var(--ink)" }}>Book · Chapter · ¶</b> for
          exact reference within the translation — for instance, <span className="mono">I.2.5</span>.
        </p>
        <h3 style={{ fontFamily: "var(--font-serif)", marginTop: "2rem", color: "var(--ink)" }}>Text source</h3>
        <p style={{ fontSize: ".95rem", color: "var(--ink-faint)" }}>{politics.meta.source}</p>
      </div>
      <p style={{ marginTop: "3rem" }}>
        <Link href="/read/1/1" className="btn btn-primary">Start reading →</Link>
      </p>
    </div>
  );
}
