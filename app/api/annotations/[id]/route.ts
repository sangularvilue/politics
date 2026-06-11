import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getThread, deleteAnnotation } from "@/lib/store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ thread });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const ok = await deleteAnnotation(id, user.id);
  if (!ok) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
