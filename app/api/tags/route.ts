import { NextResponse } from "next/server";
import { topTags } from "@/lib/store";

export async function GET() {
  const tags = await topTags(100);
  return NextResponse.json({ tags });
}
