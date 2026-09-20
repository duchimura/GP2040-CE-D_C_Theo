const BASE_SIZE = 13;
const MIN_SIZE = 8;
// Rough average glyph width as a fraction of the font size, for the semibold
// UI font the button labels use. An estimate is enough: SVG can't measure text
// before it is painted, and the goal is only "doesn't spill past the circle".
const CHAR_WIDTH_EM = 0.62;

// Font size (px) for a button label so it fits within maxWidth: the base size
// when it already fits, shrunk to fit otherwise, never below the readable
// minimum (a label that still overflows there needs shortening instead — see
// Data/dc/shortLabels.ts).
export function fitFontSize(label: string, maxWidth: number): number {
  if (!label) return BASE_SIZE;
  const fitted = maxWidth / (label.length * CHAR_WIDTH_EM);
  return Math.max(MIN_SIZE, Math.min(BASE_SIZE, Math.floor(fitted * 10) / 10));
}
