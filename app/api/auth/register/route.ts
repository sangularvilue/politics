import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { redis, userByIdKey, userKey, namesKey } from "@/lib/redis";
import { createSession, hashPassword, type StoredUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password, displayName } = await req.json().catch(() => ({}));
  const emailLower = String(email || "").trim().toLowerCase();
  const name = String(displayName || "").trim();
  const pass = String(password || "");

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailLower))
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (name.length < 2 || name.length > 40)
    return NextResponse.json({ error: "Display name must be 2–40 characters." }, { status: 400 });
  if (pass.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const existing = await redis.get<StoredUser>(userKey(emailLower));
  if (existing) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });

  const user: StoredUser = {
    id: uuid(),
    email: emailLower,
    displayName: name,
    passHash: hashPassword(pass),
    createdAt: Date.now(),
  };
  const p = redis.pipeline();
  p.set(userKey(emailLower), user);
  p.set(userByIdKey(user.id), emailLower);
  p.hset(namesKey(), { [user.id]: name });
  await p.exec();

  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
}
