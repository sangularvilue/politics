"use client";
import { useEffect, useRef, useState } from "react";

type Scope = "chapter" | "book" | "upto";
type Comments = "all" | "chapter" | "none";

export function ExportMenu({ book, chapter }: { book: number; chapter: number }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>("chapter");
  const [comments, setComments] = useState<Comments>("chapter");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    if (open) { document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey); }
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function pickScope(s: Scope) {
    setScope(s);
    // keep comments valid: chapter scope has no "all in region"
    if (s === "chapter" && comments === "all") setComments("chapter");
  }

  const commentOpts: [Comments, string][] =
    scope === "chapter"
      ? [["chapter", "This chapter’s comments"], ["none", "No comments"]]
      : [["all", "All comments in the export"], ["chapter", "Current chapter only"], ["none", "No comments"]];

  async function download() {
    setBusy(true);
    try {
      const url = `/api/export?book=${book}&chapter=${chapter}&scope=${scope}&comments=${comments}`;
      const res = await fetch(url);
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const name = /filename="([^"]+)"/.exec(cd)?.[1] || "aristotle-politics.txt";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(a.href);
    } finally { setBusy(false); setOpen(false); }
  }

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button className={`comments-toggle${open ? " active" : ""}`} onClick={() => setOpen((v) => !v)} title="Export to .txt">⤓ Export</button>
      {open && (
        <div className="export-pop" role="dialog" aria-label="Export">
          <div className="pref-row">
            <label>Range</label>
            <div className="pref-seg vert">
              {([["chapter", "Current chapter"], ["upto", "Book up to here"], ["book", "Whole book"]] as [Scope, string][]).map(([v, l]) => (
                <button key={v} className={scope === v ? "active" : ""} onClick={() => pickScope(v)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="pref-row">
            <label>Comments</label>
            <div className="pref-seg vert">
              {commentOpts.map(([v, l]) => (
                <button key={v} className={comments === v ? "active" : ""} onClick={() => setComments(v)}>{l}</button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: "100%", marginTop: ".4rem" }} disabled={busy} onClick={download}>
            {busy ? "Preparing…" : "Download .txt"}
          </button>
        </div>
      )}
    </div>
  );
}
