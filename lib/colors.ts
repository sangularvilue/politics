export const HL_COLORS = {
  amber: { dot: "#c9a24d", rgb: "201,162,77" },
  teal: { dot: "#2da68e", rgb: "45,166,142" },
  rose: { dot: "#d35670", rgb: "211,86,112" },
  green: { dot: "#6aaa4f", rgb: "106,170,79" },
  violet: { dot: "#9561ce", rgb: "149,97,206" },
  blue: { dot: "#4a7cc4", rgb: "74,124,196" },
} as const;

export type ColorName = keyof typeof HL_COLORS;
export const COLOR_NAMES = Object.keys(HL_COLORS) as ColorName[];

export function isColor(x: unknown): x is ColorName {
  return typeof x === "string" && x in HL_COLORS;
}
export function hlBg(name: string | null | undefined, alpha = 0.3): string | undefined {
  return isColor(name) ? `rgba(${HL_COLORS[name].rgb},${alpha})` : undefined;
}
export function dotColor(name: string | null | undefined): string | undefined {
  return isColor(name) ? HL_COLORS[name].dot : undefined;
}

/** Default tag→color assignments (keyed by normalized tag slug). */
export const DEFAULT_TAG_COLORS: Record<string, ColorName> = {
  teleology: "amber",
  polis: "teal",
  "the-state": "teal",
  plato: "violet",
  alcibiades: "violet",
  critique: "rose",
  method: "rose",
  nature: "green",
  "human-nature": "green",
  slavery: "rose",
  definition: "blue",
  rule: "blue",
  ethics: "amber",
  "the-good-life": "amber",
};
