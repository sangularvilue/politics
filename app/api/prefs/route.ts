import { NextRequest, NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { redis, prefsKey } from "@/lib/redis";

const ALLOWED = new Set([
  "theme", "font", "fontSize", "lineHeight", "measureWidth", "paraStyle",
  "progressBar", "commentStyle", "quickTags", "categoricalColors",
]);

export async function GET() {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ prefs: null });
  const prefs = await redis.hgetall<Record<string, unknown>>(prefsKey(uid));
  return NextResponse.json({ prefs: prefs && Object.keys(prefs).length ? prefs : null });
}

export async function PATCH(req: NextRequest) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) if (ALLOWED.has(k)) update[k] = v;
  if (Object.keys(update).length) await redis.hset(prefsKey(uid), update);
  return NextResponse.json({ ok: true });
}
