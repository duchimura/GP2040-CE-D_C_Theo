const STORAGE_KEY = 'dc.mirrored';

export function readSavedMirrored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveMirrored(mirrored: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(mirrored));
  } catch {
    // per-viewer convenience only; ignore failures
  }
}
