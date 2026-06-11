import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addReply, guestId } from "@/lib/store";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to reply." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const body = String(b.body || "").trim();
  const parentId = b.parentId ? String(b.parentId) : null;
  const asName = String(b.asName || "").trim();
  if (!body) return NextResponse.json({ error: "Reply cannot be empty." }, { status: 400 });

  const author = user.isAdmin && asName
    ? { id: guestId(asName), name: asName }
    : { id: user.id, name: user.displayName };
  const reply = await addReply(author, id, body, parentId);
  if (!reply) return NextResponse.json({ error: "Annotation not found." }, { status: 404 });
  return NextResponse.json({ reply });
}
