import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";
import { redis, tagColorsKey } from "@/lib/redis";
import { isColor, DEFAULT_TAG_COLORS } from "@/lib/colors";

export const dynamic = "force-dynamic";

// Public: anyone can read assignments (needed to render highlight colors).
export async function GET() {
  const stored = (await redis.hgetall<Record<string, string>>(tagColorsKey())) || {};
  return NextResponse.json({ colors: { ...DEFAULT_TAG_COLORS, ...stored } });
}

// Admin only: assign a color to a tag.
export async function PATCH(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { tag, color } = await req.json().catch(() => ({}));
  const t = String(tag || "").trim();
  if (!t) return NextResponse.json({ error: "Missing tag." }, { status: 400 });
  if (color === null || color === "") {
    await redis.hdel(tagColorsKey(), t);
  } else if (isColor(color)) {
    await redis.hset(tagColorsKey(), { [t]: color });
  } else {
    return NextResponse.json({ error: "Unknown color." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
