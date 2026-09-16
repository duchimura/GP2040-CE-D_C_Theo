import { create } from 'zustand';

const KEY = 'dc.mode';

export function readInitialDcMode(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'; // default ON
  } catch {
    return true;
  }
}

function persist(enabled: boolean): void {
  try {
    localStorage.setItem(KEY, enabled ? 'on' : 'off');
  } catch {
    /* per-viewer convenience only */
  }
}

interface DcModeState {
  enabled: boolean;
  toggle: () => void;
}

export const useDcMode = create<DcModeState>((set, get) => ({
  enabled: readInitialDcMode(),
  toggle: () => {
    const next = !get().enabled;
    persist(next);
    set({ enabled: next });
  },
}));
