import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { updateReply, deleteReply, guestId } from "@/lib/store";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; replyId: string }> }) {
  const { id, replyId } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const patch: { body?: string; author?: { id: string; name: string } } = {};
  if (typeof b.body === "string") patch.body = b.body.trim();
  if (user.isAdmin && typeof b.asName === "string" && b.asName.trim()) {
    patch.author = { id: guestId(b.asName.trim()), name: b.asName.trim() };
  }

  const res = await updateReply(id, replyId, patch, { id: user.id, isAdmin: user.isAdmin });
  if (res === null) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (res === "forbidden") return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  return NextResponse.json({ reply: res });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; replyId: string }> }) {
  const { id, replyId } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const ok = await deleteReply(id, replyId, { id: user.id, isAdmin: user.isAdmin });
  if (!ok) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
