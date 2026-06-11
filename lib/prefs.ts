"use client";
import { createContext, useContext } from "react";

export type Theme = "ink" | "sepia" | "paper";
export type FontKey = "garamond" | "crimson" | "baskerville" | "lora" | "source";
export type Measure = "narrow" | "medium" | "wide";
export type ParaStyle = "numbered" | "ornamental" | "none";
export type CommentStyle = "margin" | "inline" | "sidebar";

export interface Prefs {
  theme: Theme;
  font: FontKey;
  fontSize: number;     // 15–24 px
  lineHeight: number;   // 1.4–2.1
  measureWidth: Measure;
  paraStyle: ParaStyle;
  progressBar: boolean;
  commentStyle: CommentStyle;
  quickTags: boolean;
  categoricalColors: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  theme: "ink",
  font: "garamond",
  fontSize: 19,
  lineHeight: 1.78,
  measureWidth: "medium",
  paraStyle: "numbered",
  progressBar: true,
  commentStyle: "margin",
  quickTags: true,
  categoricalColors: true,
};

export const STORAGE_KEY = "politics-reading-prefs";

export const FONT_VAR: Record<FontKey, string> = {
  garamond: "var(--font-garamond), Georgia, serif",
  crimson: "var(--font-crimson), Georgia, serif",
  baskerville: "var(--font-baskerville), Georgia, serif",
  lora: "var(--font-lora), Georgia, serif",
  source: "var(--font-source), Georgia, serif",
};
export const FONT_LABEL: Record<FontKey, string> = {
  garamond: "EB Garamond", crimson: "Crimson Pro", baskerville: "Baskerville", lora: "Lora", source: "Source Serif",
};
export const MEASURE_CH: Record<Measure, string> = { narrow: "52ch", medium: "66ch", wide: "84ch" };

/** Apply prefs to the document root (CSS vars + data-attributes). Safe to call repeatedly. */
export function applyPrefs(p: Prefs) {
  if (typeof document === "undefined") return;
  const r = document.documentElement;
  r.dataset.theme = p.theme;
  r.dataset.para = p.paraStyle;
  r.dataset.progressbar = p.progressBar ? "on" : "off";
  r.style.setProperty("--reading-font", FONT_VAR[p.font]);
  r.style.setProperty("--reading-size", `${p.fontSize}px`);
  r.style.setProperty("--reading-leading", String(p.lineHeight));
  r.style.setProperty("--reading-measure", MEASURE_CH[p.measureWidth]);
}

export function loadLocalPrefs(): Prefs {
  if (typeof localStorage === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PREFS;
}

export interface PrefsCtx {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
}
export const PrefsContext = createContext<PrefsCtx>({ prefs: DEFAULT_PREFS, setPref: () => {} });
export const usePrefs = () => useContext(PrefsContext);
