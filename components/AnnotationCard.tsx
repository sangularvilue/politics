import Link from "next/link";
import type { Annotation } from "@/lib/types";
import { cite } from "@/lib/text";

export function AnnotationCard({ a, showAuthor = true }: { a: Annotation; showAuthor?: boolean }) {
  const firstN = a.anchors[0]?.blockId.match(/\.p(\d+)$/)?.[1];
  return (
    <Link href={`/read/${a.book}/${a.chapter}?a=${a.id}`} className="list-item">
      <div className="cite">Politics {cite(a.book, a.chapter)}{firstN ? `.${firstN}` : ""}</div>
      {a.quote && <div className="q">“{a.quote.length > 180 ? a.quote.slice(0, 180) + "…" : a.quote}”</div>}
      <div className="b">{a.body.length > 240 ? a.body.slice(0, 240) + "…" : a.body}</div>
      <div className="ft">
        {showAuthor && <span>{a.authorName}</span>}
        {a.replyCount > 0 && <span>{a.replyCount} repl{a.replyCount === 1 ? "y" : "ies"}</span>}
        {a.tags.length > 0 && <span className="mono">{a.tags.map((t) => `#${t}`).join(" ")}</span>}
      </div>
    </Link>
  );
}
