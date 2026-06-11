import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getThread, deleteAnnotation, updateAnnotation, guestId } from "@/lib/store";

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
  const patch: { body?: string; tags?: string[]; author?: { id: string; name: string } } = {};
  if (typeof b.body === "string") patch.body = b.body.trim();
  if (Array.isArray(b.tags)) patch.tags = b.tags.map(String);
  if (user.isAdmin && typeof b.asName === "string" && b.asName.trim()) {
    patch.author = { id: guestId(b.asName.trim()), name: b.asName.trim() };
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
