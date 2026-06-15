import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listNotifications, markNotificationsSeen } from "@/lib/store";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const data = await listNotifications(user.id);
  return NextResponse.json(data);
}

/** Marks every notification as seen (resets the bell badge). */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  await markNotificationsSeen(user.id);
  return NextResponse.json({ ok: true });
}
