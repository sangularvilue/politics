import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addReply } from "@/lib/store";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to reply." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const body = String(b.body || "").trim();
  const parentId = b.parentId ? String(b.parentId) : null;
  if (!body) return NextResponse.json({ error: "Reply cannot be empty." }, { status: 400 });

  const reply = await addReply(user, id, body, parentId);
  if (!reply) return NextResponse.json({ error: "Annotation not found." }, { status: 404 });
  return NextResponse.json({ reply });
}
