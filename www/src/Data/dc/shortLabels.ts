// Stock button-label text that is too wide for an extra-button circle in the
// visualizer (radius 20 — see Data/dc/extraButtons.ts). Keyed by the stock
// label so Data/Buttons.js stays untouched; only the drawn circles use these
// (the remap function list has room for the full names).
const SHORT_LABELS: Record<string, string> = {
  'Touchpad Center': 'TPad',
};

export const shortLabel = (label: string): string => SHORT_LABELS[label] ?? label;
