import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getThread, deleteAnnotation, updateAnnotation, getAnnotation, guestId } from "@/lib/store";
import { getChapter } from "@/lib/text";
import type { Anchor } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ thread });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const patch: { body?: string; tags?: string[]; author?: { id: string; name: string }; anchors?: Anchor[]; quote?: string } = {};
  if (typeof b.body === "string") patch.body = b.body.trim();
  if (Array.isArray(b.tags)) patch.tags = b.tags.map(String);
  if (user.isAdmin && typeof b.asName === "string" && b.asName.trim()) {
    patch.author = { id: guestId(b.asName.trim()), name: b.asName.trim() };
  }

  // re-anchor (edit highlighted region): validate the new anchors lie within
  // the annotation's own chapter.
  if (Array.isArray(b.anchors) && b.anchors.length) {
    const existing = await getAnnotation(id);
    if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const ch = getChapter(existing.book, existing.chapter);
    if (!ch) return NextResponse.json({ error: "Unknown passage." }, { status: 400 });
    for (const an of b.anchors as Anchor[]) {
      const block = ch.blocks.find((bl) => bl.id === an.blockId);
      if (!block || an.start < 0 || an.end > block.text.length || an.start >= an.end)
        return NextResponse.json({ error: "New selection must be within this chapter." }, { status: 400 });
    }
    patch.anchors = b.anchors;
    patch.quote = typeof b.quote === "string" ? b.quote : "";
  }

  const res = await updateAnnotation(id, patch, { id: user.id, isAdmin: user.isAdmin });
  if (res === null) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (res === "forbidden") return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  return NextResponse.json({ annotation: res });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const ok = await deleteAnnotation(id, { id: user.id, isAdmin: user.isAdmin });
  if (!ok) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
