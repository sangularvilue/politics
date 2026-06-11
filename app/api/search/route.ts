import { NextRequest, NextResponse } from "next/server";
import { searchPassages, resolveBekker } from "@/lib/search";
import { searchAnnotations } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ q, bekker: null, passages: [], comments: [] });

  const [comments] = await Promise.all([searchAnnotations(q)]);
  const passages = searchPassages(q);
  const bekker = resolveBekker(q);

  return NextResponse.json({ q, bekker, passages, comments });
}
