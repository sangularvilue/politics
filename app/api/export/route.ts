import { NextRequest } from "next/server";
import { getBook } from "@/lib/text";
import { listByBook, getReplies } from "@/lib/store";
import { renderExport } from "@/lib/export";
import { getBookOverrides, mergeBookOverrides } from "@/lib/overrides";
import { parseBlockId } from "@/lib/selection";
import { currentUser } from "@/lib/auth";
import type { Reply } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const book = Number(sp.get("book"));
  const chapter = Number(sp.get("chapter"));
  const scope = sp.get("scope") || "chapter";   // chapter | book | upto
  let comments = sp.get("comments") || "none"; // all | chapter | none
  // comments are visible only to signed-in users
  if (comments !== "none" && !(await currentUser())) comments = "none";

  const bk0 = getBook(book);
  if (!bk0) return new Response("Unknown book.", { status: 400 });
  // fold in any admin text corrections so downloads match what's on the page
  const bk = mergeBookOverrides(bk0, await getBookOverrides(book));

  // chapters to include
  let chapters = bk.chapters;
  let scopeLabel = `Book ${bk.title.replace("Book ", "")} — complete`;
  if (scope === "chapter") { chapters = bk.chapters.filter((c) => c.chapter === chapter); scopeLabel = `${bk.title}, Chapter ${chapter}`; }
  else if (scope === "upto") { chapters = bk.chapters.filter((c) => c.chapter <= chapter); scopeLabel = `${bk.title}, Chapters 1–${chapter}`; }

  const includedChapters = new Set(chapters.map((c) => c.chapter));

  // annotations to inline
  let annotations: Awaited<ReturnType<typeof listByBook>> = [];
  let commentsLabel = "none";
  if (comments !== "none") {
    const all = await listByBook(book);
    if (comments === "chapter") {
      annotations = all.filter((a) => parseBlockId(a.anchors[0]?.blockId || "")?.chapter === chapter);
      commentsLabel = `current chapter only (${annotations.length})`;
    } else { // all in region
      annotations = all.filter((a) => {
        const c = parseBlockId(a.anchors[0]?.blockId || "")?.chapter;
        return c != null && includedChapters.has(c);
      });
      commentsLabel = `all in region (${annotations.length})`;
    }
  }

  // replies for the included annotations
  const repliesByAnnot: Record<string, Reply[]> = {};
  await Promise.all(annotations.map(async (a) => { repliesByAnnot[a.id] = await getReplies(a.id); }));

  const txt = renderExport({ book: bk, chapters, annotations, repliesByAnnot, scopeLabel, commentsLabel });

  const part = scope === "chapter" ? `book${book}-ch${chapter}` : scope === "upto" ? `book${book}-thru-ch${chapter}` : `book${book}`;
  const filename = `aristotle-politics-${part}.txt`;
  return new Response(txt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
