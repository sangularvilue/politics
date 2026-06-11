import data from "@/data/politics.json";
import type { Politics, Book, Chapter } from "./types";

export const politics = data as Politics;
export const books = politics.books;

export function getBook(book: number): Book | undefined {
  return books.find((b) => b.book === book);
}

export function getChapter(book: number, chapter: number): Chapter | undefined {
  return getBook(book)?.chapters.find((c) => c.chapter === chapter);
}

export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export interface ChapterRef {
  book: number;
  chapter: number;
}

/** Flat ordered list of every chapter, for prev/next navigation. */
export function allChapters(): ChapterRef[] {
  const out: ChapterRef[] = [];
  for (const b of books) for (const c of b.chapters) out.push({ book: b.book, chapter: c.chapter });
  return out;
}

export function neighbours(book: number, chapter: number): { prev: ChapterRef | null; next: ChapterRef | null } {
  const flat = allChapters();
  const i = flat.findIndex((r) => r.book === book && r.chapter === chapter);
  return {
    prev: i > 0 ? flat[i - 1] : null,
    next: i >= 0 && i < flat.length - 1 ? flat[i + 1] : null,
  };
}

/** A short citation label, e.g. "I.2.5" -> Book I, ch.2, ¶5. */
export function cite(book: number, chapter: number, n?: number): string {
  return `${ROMAN[book]}.${chapter}${n != null ? `.${n}` : ""}`;
}

export function blockText(blockId: string): string | undefined {
  // blockId form: b{book}.c{chapter}.p{n}
  const m = blockId.match(/^b(\d+)\.c(\d+)\.p(\d+)$/);
  if (!m) return undefined;
  const ch = getChapter(+m[1], +m[2]);
  return ch?.blocks.find((bl) => bl.n === +m[3])?.text;
}
