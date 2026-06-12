import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getChapter } from "@/lib/text";
import {
  createAnnotation, listByChapter, listByBook, listByTag, listByUser, listRecent, guestId,
} from "@/lib/store";
import type { Anchor } from "@/lib/types";

// GET /api/annotations?book=&chapter=  | ?book=  | ?tag=  | ?user=  | ?recent=1
export async function GET(req: NextRequest) {
  // Comments are visible only to signed-in users.
  const viewer = await currentUser();
  if (!viewer) return NextResponse.json({ annotations: [] });
  const sp = req.nextUrl.searchParams;
  const book = sp.get("book") ? Number(sp.get("book")) : null;
  const chapter = sp.get("chapter") ? Number(sp.get("chapter")) : null;
  const tag = sp.get("tag");
  const user = sp.get("user");

  let annotations;
  if (book != null && chapter != null) annotations = await listByChapter(book, chapter);
  else if (tag) annotations = await listByTag(tag);
  else if (user) annotations = await listByUser(user);
  else if (book != null) annotations = await listByBook(book);
  else annotations = await listRecent(60);

  return NextResponse.json({ annotations });
}

// POST /api/annotations  — create a highlight + root comment
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to comment." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const book = Number(b.book), chapter = Number(b.chapter);
  const anchors: Anchor[] = Array.isArray(b.anchors) ? b.anchors : [];
  const quote = String(b.quote || "");
  const body = String(b.body || "").trim();
  const tags: string[] = Array.isArray(b.tags) ? b.tags.map(String) : [];
  const asName = String(b.asName || "").trim();

  if (!body) return NextResponse.json({ error: "Comment cannot be empty." }, { status: 400 });
  if (!anchors.length) return NextResponse.json({ error: "Select some text to highlight." }, { status: 400 });

  // Validate anchors against the actual text.
  const ch = getChapter(book, chapter);
  if (!ch) return NextResponse.json({ error: "Unknown passage." }, { status: 400 });
  for (const an of anchors) {
    const block = ch.blocks.find((bl) => bl.id === an.blockId);
    if (!block) return NextResponse.json({ error: "Anchor does not match the text." }, { status: 400 });
    if (an.start < 0 || an.end > block.text.length || an.start >= an.end)
      return NextResponse.json({ error: "Invalid selection range." }, { status: 400 });
  }

  const author = user.isAdmin && asName
    ? { id: guestId(asName), name: asName }
    : { id: user.id, name: user.displayName };
  const a = await createAnnotation(author, { book, chapter, anchors, quote, body, tags });
  return NextResponse.json({ annotation: a });
}
