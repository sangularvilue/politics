import { NextRequest, NextResponse } from "next/server";
import { redis, userKey } from "@/lib/redis";
import { createSession, verifyPassword, type StoredUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  const emailLower = String(email || "").trim().toLowerCase();
  const pass = String(password || "");

  const user = await redis.get<StoredUser>(userKey(emailLower));
  if (!user || !verifyPassword(pass, user.passHash))
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });

  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
}
