"use client";
import { useEffect, useState } from "react";
import { COLOR_NAMES, dotColor, hlBg, type ColorName } from "@/lib/colors";

export function TagColorModal({ onClose }: { onClose: () => void }) {
  const [tags, setTags] = useState<string[]>([]);
  const [colors, setColors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/tags").then((r) => r.json()).then((j) => setTags((j.tags || []).map((t: { tag: string }) => t.tag)));
    fetch("/api/admin/tag-colors").then((r) => r.json()).then((j) => setColors(j.colors || {}));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function assign(tag: string, color: ColorName) {
    const next = colors[tag] === color ? "" : color; // click selected swatch again to clear
    setColors((prev) => { const c = { ...prev }; if (next) c[tag] = next; else delete c[tag]; return c; });
    fetch("/api/admin/tag-colors", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag, color: next || null }),
    }).catch(() => {});
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>Tag color assignments</h3>
          <p>Colors apply to highlights and tag dots when “Colored tags” is on.</p>
        </div>
        <div className="modal-body">
          {tags.length === 0 && <p className="muted">No tags yet.</p>}
          {tags.map((t) => (
            <div className="tc-row" key={t}>
              <span className="tc-name">#{t}</span>
              <div className="tc-swatches">
                {COLOR_NAMES.map((c) => (
                  <button key={c} className={`tc-swatch${colors[t] === c ? " sel" : ""}`}
                    style={{ background: dotColor(c) }} title={c} aria-label={c} onClick={() => assign(t, c)} />
                ))}
              </div>
              <span className="tc-current">{colors[t] || "—"}</span>
            </div>
          ))}
        </div>
        <div className="modal-foot">
          <div className="tc-preview">
            {tags.filter((t) => colors[t]).map((t) => (
              <span key={t} className="tc-chip" style={{ background: hlBg(colors[t], 0.34), color: dotColor(colors[t]) }}>#{t}</span>
            ))}
          </div>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
