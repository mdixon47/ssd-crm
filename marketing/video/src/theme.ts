/**
 * Brand tokens — mirrored from the Nuxt app's tailwind theme (nuxt.config.ts)
 * so video output stays visually consistent with the product/site.
 */
export const brand = {
  // primary navy family
  bg: "#0b1120",
  bgDeep: "#070c18",
  bgPanel: "#111d35",
  bgPanel2: "#0d1628",
  // accent cyan family
  accent: "#06b6d4",
  accentLight: "#22d3ee",
  accentGlow: "#67e8f9",
  // text
  white: "#f0f5ff",
  textSoft: "#dce8f8",
  textMuted: "#94a3b8",
  // channel colors
  google: "#4285F4",
  fb: "#1877F2",
  ig: "#E1306C",
  li: "#0A66C2",
} as const;

export const fontFamilyHeading = "Inter, system-ui, sans-serif";
export const fontFamilyBody = "Inter, system-ui, sans-serif";

/** Single source of truth for frame rate + seconds→frames, shared by all comps. */
export const FPS = 30;
export const sec = (s: number) => Math.round(s * FPS);

/**
 * Layout scale: text/elements size off the SHORTER edge so a single
 * composition reads correctly in 16:9, 9:16, and 1:1 without per-format forks.
 */
export const scaleFor = (width: number, height: number) =>
  Math.min(width, height) / 1080;
