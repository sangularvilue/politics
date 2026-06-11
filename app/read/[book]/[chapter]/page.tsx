import { notFound } from "next/navigation";
import Link from "next/link";
import { getBook, getChapter, neighbours, ROMAN, cite } from "@/lib/text";
import { listByChapter } from "@/lib/store";
import { currentUser } from "@/lib/auth";
import { Reader } from "@/components/Reader";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book, chapter } = await params;
  return { title: `Politics ${cite(+book, +chapter)} — Aristotle, tr. Jowett` };
}

export default async function ReadPage({ params, searchParams }: {
  params: Promise<{ book: string; chapter: string }>;
  searchParams: Promise<{ a?: string }>;
}) {
  const { book: bStr, chapter: cStr } = await params;
  const { a: openId } = await searchParams;
  const book = Number(bStr), chapter = Number(cStr);
  const bk = getBook(book);
  const ch = getChapter(book, chapter);
  if (!bk || !ch) notFound();

  const [annotations, user] = await Promise.all([listByChapter(book, chapter), currentUser()]);
  const { prev, next } = neighbours(book, chapter);

  return (
    <div className="reader-shell">
      <div className="reader-main">
        <div className="reader-col">
          <header className="chapter-head">
            <div className="bk">
              <Link href="/browse">{bk.title}</Link> · Chapter {chapter}
            </div>
            <h1>Chapter {chapter}</h1>
            {chapter === 1 && <div className="theme">{bk.theme}</div>}
            <div className="bekker">Bekker {bk.bekker} · cite as {cite(book, chapter)}.¶</div>
          </header>

          <Reader
            book={book}
            chapter={chapter}
            blocks={ch.blocks}
            initialAnnotations={annotations}
            user={user}
            openId={openId}
          />

          <nav className="chapter-nav">
            {prev ? (
              <Link href={`/read/${prev.book}/${prev.chapter}`}>
                <span className="lbl">Previous</span>
                {ROMAN[prev.book]}. Chapter {prev.chapter}
              </Link>
            ) : <span />}
            {next ? (
              <Link href={`/read/${next.book}/${next.chapter}`} style={{ textAlign: "right" }}>
                <span className="lbl">Next</span>
                {ROMAN[next.book]}. Chapter {next.chapter}
              </Link>
            ) : <span />}
          </nav>
        </div>
      </div>
    </div>
  );
}
