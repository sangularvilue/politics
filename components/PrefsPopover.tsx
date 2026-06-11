"use client";
import { useEffect, useRef } from "react";
import { usePrefs, FONT_LABEL, type FontKey } from "@/lib/prefs";

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="pref-seg">
      {options.map(([v, label]) => (
        <button key={v} className={value === v ? "active" : ""} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  );
}

function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button className={`pref-toggle${on ? " on" : ""}`} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <span className="knob" />{label}
    </button>
  );
}

export function PrefsPopover({ onClose }: { onClose: () => void }) {
  const { prefs, setPref } = usePrefs();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="prefs-pop" ref={ref} role="dialog" aria-label="Reading preferences">
      <div className="prefs-grid">
        <div className="pref-row">
          <label>Theme</label>
          <Seg value={prefs.theme} onChange={(v) => setPref("theme", v)}
            options={[["ink", "Ink"], ["sepia", "Sepia"], ["paper", "Paper"]]} />
        </div>

        <div className="pref-row">
          <label>Typeface</label>
          <div className="font-grid">
            {(Object.keys(FONT_LABEL) as FontKey[]).map((f) => (
              <button key={f} className={prefs.font === f ? "active" : ""}
                style={{ fontFamily: `var(--font-${f})` }} onClick={() => setPref("font", f)}>{FONT_LABEL[f]}</button>
            ))}
          </div>
        </div>

        <div className="pref-row">
          <label>Size <span className="pref-val">{prefs.fontSize}px</span></label>
          <input type="range" min={15} max={24} step={1} value={prefs.fontSize}
            onChange={(e) => setPref("fontSize", Number(e.target.value))} />
        </div>

        <div className="pref-row">
          <label>Line height <span className="pref-val">{prefs.lineHeight.toFixed(2)}</span></label>
          <input type="range" min={1.4} max={2.1} step={0.05} value={prefs.lineHeight}
            onChange={(e) => setPref("lineHeight", Number(e.target.value))} />
        </div>

        <div className="pref-row">
          <label>Width</label>
          <Seg value={prefs.measureWidth} onChange={(v) => setPref("measureWidth", v)}
            options={[["narrow", "Narrow"], ["medium", "Medium"], ["wide", "Wide"]]} />
        </div>

        <div className="pref-row">
          <label>Paragraphs</label>
          <Seg value={prefs.paraStyle} onChange={(v) => setPref("paraStyle", v)}
            options={[["numbered", "¶ 12"], ["ornamental", "❧"], ["none", "None"]]} />
        </div>

        <div className="pref-row">
          <label>Comments</label>
          <Seg value={prefs.commentStyle} onChange={(v) => setPref("commentStyle", v)}
            options={[["margin", "Margin"], ["inline", "Inline"], ["sidebar", "Sidebar"]]} />
        </div>

        <div className="pref-toggles">
          <Toggle on={prefs.progressBar} label="Progress bar" onChange={(v) => setPref("progressBar", v)} />
          <Toggle on={prefs.quickTags} label="Quick tags" onChange={(v) => setPref("quickTags", v)} />
          <Toggle on={prefs.categoricalColors} label="Colored tags" onChange={(v) => setPref("categoricalColors", v)} />
        </div>
      </div>
    </div>
  );
}
