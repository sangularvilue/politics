import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";
import { redis, textOverridesKey, textEditsLogKey } from "@/lib/redis";
import { blockText } from "@/lib/text";
import { parseBlockId } from "@/lib/selection";
import { remapBlockAnnotations } from "@/lib/overrides";

export const dynamic = "force-dynamic";

const MAX_LEN = 20000;

// Admin only: correct the text of a single paragraph. Corrections are stored as
// a Redis overlay (the JSON source is read-only at runtime on Vercel) and merged
// back in on render. Existing comment highlights on the paragraph are realigned.
export async function PATCH(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { blockId, text } = await req.json().catch(() => ({}));
  const id = String(blockId || "");
  const meta = parseBlockId(id);
  const original = blockText(id);
  if (!meta || original == null) return NextResponse.json({ error: "Unknown paragraph." }, { status: 400 });
  if (typeof text !== "string") return NextResponse.json({ error: "Missing text." }, { status: 400 });

  const next = text.replace(/\r\n/g, "\n").trim();
  if (!next) return NextResponse.json({ error: "A paragraph can't be empty." }, { status: 400 });
  if (next.length > MAX_LEN) return NextResponse.json({ error: "That's too long for one paragraph." }, { status: 400 });

  // The displayed text we're editing from is the existing override, else the original.
  const existing = await redis.hget<string>(textOverridesKey(meta.book), id);
  const current = existing ?? original;
  if (next === current) return NextResponse.json({ ok: true, text: next, remapped: 0 });

  const remapped = await remapBlockAnnotations(id, current, next);

  // Storing the original text again just clears the override (keeps Redis tidy).
  if (next === original) await redis.hdel(textOverridesKey(meta.book), id);
  else await redis.hset(textOverridesKey(meta.book), { [id]: next });

  await redis.lpush(
    textEditsLogKey(),
    JSON.stringify({ blockId: id, by: admin.id, byName: admin.displayName, at: Date.now(), from: current, to: next })
  );
  await redis.ltrim(textEditsLogKey(), 0, 499);

  return NextResponse.json({ ok: true, text: next, remapped });
}
