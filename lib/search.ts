import { books } from "./text";

export interface PassageHit {
  book: number;
  chapter: number;
  blockId: string;
  n: number;
  snippet: string;   // plain text with the match somewhere inside
  cite: string;      // e.g. "III.4.2"
}

export interface BekkerHit {
  book: number;
  title: string;
  theme: string;
  range: string;
  page: string;      // the matched token, normalised e.g. "1280b"
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

/** numeric sort key for a Bekker page like "1252a" -> 12520, "1252b" -> 12525 */
function bekKey(page: number, col?: string): number {
  return page * 10 + (col === "b" ? 5 : 0);
}

/** If the query contains a Bekker page (1252–1342, optional a/b), resolve it to a book. */
export function resolveBekker(q: string): BekkerHit | null {
  const m = q.match(/\b(12[5-9]\d|13[0-4]\d)\s*([abAB])?\b/);
  if (!m) return null;
  const page = Number(m[1]);
  const col = m[2]?.toLowerCase();
  const key = bekKey(page, col);
  for (const b of books) {
    const [lo, hi] = b.bekker.split(/[–-]/).map((s) => s.trim());
    const lm = lo.match(/(\d+)([ab])?/), hm = hi.match(/(\d+)([ab])?/);
    if (!lm || !hm) continue;
    const loKey = bekKey(Number(lm[1]), lm[2]);
    const hiKey = bekKey(Number(hm[1]), hm[2]) + 9; // include the whole closing column
    if (key >= loKey && key <= hiKey) {
      return { book: b.book, title: b.title, theme: b.theme, range: b.bekker, page: `${page}${col || ""}` };
    }
  }
  return null;
}

/** Case-insensitive substring search across the whole work. */
export function searchPassages(q: string, limit = 60): PassageHit[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  const hits: PassageHit[] = [];
  for (const b of books) {
    for (const ch of b.chapters) {
      for (const bl of ch.blocks) {
        const i = bl.text.toLowerCase().indexOf(needle);
        if (i < 0) continue;
        const from = Math.max(0, i - 70);
        const to = Math.min(bl.text.length, i + needle.length + 110);
        const snippet = (from > 0 ? "…" : "") + bl.text.slice(from, to).trim() + (to < bl.text.length ? "…" : "");
        hits.push({
          book: b.book, chapter: ch.chapter, blockId: bl.id, n: bl.n, snippet,
          cite: `${ROMAN[b.book]}.${ch.chapter}.${bl.n}`,
        });
        if (hits.length >= limit) return hits;
      }
    }
  }
  return hits;
}
