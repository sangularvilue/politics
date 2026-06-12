import type { Book, Chapter, Annotation, Reply } from "./types";

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const cite = (b: number, c: number, n: number) => `${ROMAN[b]}.${c}.${n}`;
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
const shortId = (id: string) => id.slice(0, 8);

interface Insert { pos: number; kind: "open" | "close"; str: string }

/** Render a plain-text export of the given chapters, inlining the given annotations. */
export function renderExport(opts: {
  book: Book;
  chapters: Chapter[];
  annotations: Annotation[];
  repliesByAnnot: Record<string, Reply[]>;
  scopeLabel: string;
  commentsLabel: string;
}): string {
  const { book, chapters, annotations, repliesByAnnot, scopeLabel, commentsLabel } = opts;

  // group open/close insertions by block
  const byBlock: Record<string, Insert[]> = {};
  for (const a of annotations) {
    if (!a.anchors.length) continue;
    const first = a.anchors[0];
    const last = a.anchors[a.anchors.length - 1];
    const replies = repliesByAnnot[a.id] || [];
    const repStr = replies.map((r) => `, ${oneLine(r.authorName)}, ${oneLine(r.body)}`).join("");
    const open = `[${shortId(a.id)}, ${oneLine(a.authorName)}, ${oneLine(a.body)}${repStr}]`;
    const close = `[end highlight ${shortId(a.id)}]`;
    (byBlock[first.blockId] ||= []).push({ pos: first.start, kind: "open", str: open });
    (byBlock[last.blockId] ||= []).push({ pos: last.end, kind: "close", str: close });
  }

  function renderBlock(text: string, blockId: string): string {
    const ins = byBlock[blockId];
    if (!ins || !ins.length) return text;
    // splice from the end so earlier positions stay valid; close before open at equal pos
    const sorted = [...ins].sort((x, y) => y.pos - x.pos || (x.kind === "close" ? -1 : 1));
    let out = text;
    for (const it of sorted) {
      const p = Math.max(0, Math.min(out.length, it.pos));
      out = out.slice(0, p) + (it.kind === "open" ? it.str + " " : " " + it.str) + out.slice(p);
    }
    return out;
  }

  const lines: string[] = [];
  lines.push("ARISTOTLE — POLITICS");
  lines.push("translated by Benjamin Jowett");
  lines.push(scopeLabel);
  lines.push(`Comments: ${commentsLabel}`);
  lines.push(`[Bekker ${book.bekker}]`);
  lines.push(`exported ${new Date().toISOString().slice(0, 10)}`);
  lines.push("=".repeat(60));

  for (const ch of chapters) {
    lines.push("");
    lines.push(`[${book.title} · Chapter ${ch.chapter}]`);
    lines.push("");
    for (const bl of ch.blocks) {
      lines.push(`[${cite(book.book, ch.chapter, bl.n)}] ${renderBlock(bl.text, bl.id)}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}
