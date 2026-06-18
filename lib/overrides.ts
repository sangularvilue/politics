import { redis, textOverridesKey, annotKey } from "./redis";
import { blockText } from "./text";
import { listByChapter } from "./store";
import { parseBlockId } from "./selection";
import type { Book } from "./types";

/** All admin text corrections for a book: { blockId -> corrected text }. */
export async function getBookOverrides(book: number): Promise<Record<string, string>> {
  return (await redis.hgetall<Record<string, string>>(textOverridesKey(book))) || {};
}

/** A Book clone with corrected block texts merged in. Cheap no-op when empty. */
export function mergeBookOverrides(bk: Book, overrides: Record<string, string>): Book {
  if (!overrides || Object.keys(overrides).length === 0) return bk;
  return {
    ...bk,
    chapters: bk.chapters.map((ch) => ({
      ...ch,
      blocks: ch.blocks.map((b) => (overrides[b.id] != null ? { ...b, text: overrides[b.id] } : b)),
    })),
  };
}

// ---- annotation re-anchoring after a text edit ----
// Annotations are anchored to character ranges [start,end) within a block. When
// an admin corrects a typo the offsets shift, so we remap them with a simple
// prefix/suffix diff — exactly the shape of a localized edit. Anything that fell
// inside the changed span collapses to its edge; everything after shifts by the
// length delta. Good enough that highlights stay aligned for ordinary corrections.

interface Diff { p: number; s: number; oldLen: number; newLen: number; delta: number }

function computeDiff(oldText: string, newText: string): Diff {
  const oldLen = oldText.length, newLen = newText.length;
  const max = Math.min(oldLen, newLen);
  let p = 0;
  while (p < max && oldText.charCodeAt(p) === newText.charCodeAt(p)) p++;
  let s = 0;
  while (s < max - p && oldText.charCodeAt(oldLen - 1 - s) === newText.charCodeAt(newLen - 1 - s)) s++;
  return { p, s, oldLen, newLen, delta: newLen - oldLen };
}

function remapOffset(x: number, d: Diff, which: "start" | "end"): number {
  const oldChangeEnd = d.oldLen - d.s;
  const newChangeEnd = d.newLen - d.s;
  let r: number;
  if (x <= d.p) r = x;                          // before the change — unmoved
  else if (x >= oldChangeEnd) r = x + d.delta;  // after the change — shifted
  else r = which === "start" ? d.p : newChangeEnd; // inside the change — snap to its edge
  return Math.max(0, Math.min(d.newLen, r));
}

/**
 * Realign any annotation highlights on `blockId` from `oldText` to `newText`,
 * and refresh their stored quote. Returns the number of annotations touched.
 */
export async function remapBlockAnnotations(blockId: string, oldText: string, newText: string): Promise<number> {
  if (oldText === newText) return 0;
  const meta = parseBlockId(blockId);
  if (!meta) return 0;

  const annots = await listByChapter(meta.book, meta.chapter);
  const affected = annots.filter((a) => a.anchors.some((an) => an.blockId === blockId));
  if (!affected.length) return 0;

  const d = computeDiff(oldText, newText);
  const overrides = await getBookOverrides(meta.book);
  const textOf = (id: string): string =>
    id === blockId ? newText : (overrides[id] ?? blockText(id) ?? "");

  const p = redis.pipeline();
  for (const a of affected) {
    a.anchors = a.anchors.map((an) => {
      if (an.blockId !== blockId) return an;
      const start = remapOffset(an.start, d, "start");
      let end = remapOffset(an.end, d, "end");
      if (end < start) end = start;
      return { ...an, start, end };
    });
    a.quote = a.anchors
      .map((an) => textOf(an.blockId).slice(an.start, an.end))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2000);
    p.set(annotKey(a.id), a);
  }
  await p.exec();
  return affected.length;
}
