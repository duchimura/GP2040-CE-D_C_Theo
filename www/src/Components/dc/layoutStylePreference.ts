import type { LayoutStyle } from '../../Data/dc/layouts';

const STORAGE_KEY = 'dc.layoutStyle';

export function readSavedLayoutStyle(): LayoutStyle | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'leverless' || v === 'arcadeStick' ? v : null;
  } catch {
    return null;
  }
}

export function saveLayoutStyle(style: LayoutStyle): void {
  try {
    localStorage.setItem(STORAGE_KEY, style);
  } catch {
    // per-viewer convenience only; ignore failures
  }
}
