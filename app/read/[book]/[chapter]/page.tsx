import { notFound } from "next/navigation";
import { getBook, getChapter, neighbours, cite } from "@/lib/text";
import { listByBook } from "@/lib/store";
import { currentUser } from "@/lib/auth";
import { redis, tagColorsKey } from "@/lib/redis";
import { DEFAULT_TAG_COLORS } from "@/lib/colors";
import { Reader } from "@/components/Reader";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book, chapter } = await params;
  return { title: `Aristotle's Politics — ${cite(+book, +chapter)}` };
}

export default async function ReadPage({ params, searchParams }: {
  params: Promise<{ book: string; chapter: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { book: bStr, chapter: cStr } = await params;
  const { a: openId, b: focusBlockId } = await searchParams;
  const book = Number(bStr), chapter = Number(cStr);
  const bk = getBook(book);
  const ch = getChapter(book, chapter);
  if (!bk || !ch) notFound();

  const [user, stored] = await Promise.all([
    currentUser(), redis.hgetall<Record<string, string>>(tagColorsKey()),
  ]);
  // Comments are visible only to signed-in users.
  const annotations = user ? await listByBook(book) : [];
  const tagColors = { ...DEFAULT_TAG_COLORS, ...(stored || {}) };
  const { prev, next } = neighbours(book, chapter);

  return (
    <Reader
      book={bk}
      currentChapter={chapter}
      prev={prev}
      next={next}
      initialAnnotations={annotations}
      user={user}
      openId={openId}
      focusBlockId={focusBlockId}
      tagColors={tagColors}
    />
  );
}
