import type { Anchor, Block } from "./types";

/** char offset from the start of blockEl to (node, offset). */
function offsetWithin(blockEl: HTMLElement, node: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(blockEl);
  try { r.setEnd(node, offset); } catch { return blockEl.textContent?.length ?? 0; }
  return r.toString().length;
}

export interface SelectionResult {
  anchors: Anchor[];
  quote: string;
  rect: DOMRect;
}

/**
 * Build annotation anchors from the current window selection, if it lies within
 * `container`. `blocks` must be the flat, in-order list of blocks currently
 * rendered (their DOM nodes carry data-block-id / data-block-idx).
 */
export function selectionToAnchors(container: HTMLElement, blocks: Block[]): SelectionResult | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);

  const startEl = (range.startContainer.nodeType === 1 ? (range.startContainer as HTMLElement) : range.startContainer.parentElement)?.closest<HTMLElement>("[data-block-id]");
  const endEl = (range.endContainer.nodeType === 1 ? (range.endContainer as HTMLElement) : range.endContainer.parentElement)?.closest<HTMLElement>("[data-block-id]");
  if (!startEl || !endEl || !container.contains(startEl) || !container.contains(endEl)) return null;

  const startIdx = Number(startEl.dataset.blockIdx);
  const endIdx = Number(endEl.dataset.blockIdx);
  if (Number.isNaN(startIdx) || Number.isNaN(endIdx)) return null;

  const forward = startIdx < endIdx || (startIdx === endIdx && range.startOffset <= range.endOffset);
  const [lo, hi] = forward ? [startIdx, endIdx] : [endIdx, startIdx];
  const lowEl = forward ? startEl : endEl;
  const highEl = forward ? endEl : startEl;
  const lowNode = forward ? range.startContainer : range.endContainer;
  const lowOffset = forward ? range.startOffset : range.endOffset;
  const highNode = forward ? range.endContainer : range.startContainer;
  const highOffset = forward ? range.endOffset : range.startOffset;

  const lowOff = offsetWithin(lowEl, lowNode, lowOffset);
  const highOff = offsetWithin(highEl, highNode, highOffset);

  const anchors: Anchor[] = [];
  for (let i = lo; i <= hi; i++) {
    const b = blocks[i];
    if (!b) continue;
    const s = i === lo ? lowOff : 0;
    const e = i === hi ? highOff : b.text.length;
    if (e > s) anchors.push({ blockId: b.id, start: s, end: e });
  }
  const quote = sel.toString().replace(/\s+/g, " ").trim();
  if (!anchors.length || !quote) return null;

  return { anchors, quote, rect: range.getBoundingClientRect() };
}

/** Parse "b{book}.c{chapter}.p{n}" → {book, chapter, n}. */
export function parseBlockId(id: string): { book: number; chapter: number; n: number } | null {
  const m = id.match(/^b(\d+)\.c(\d+)\.p(\d+)$/);
  return m ? { book: +m[1], chapter: +m[2], n: +m[3] } : null;
}
