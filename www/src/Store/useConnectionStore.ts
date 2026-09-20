import { create } from 'zustand';
// @ts-expect-error - WebApi.js is untyped JS
import { baseUrl } from '../Services/WebApi';

export type ConnectionStatus = 'searching' | 'connected' | 'lost';

export interface ControllerInfo {
  version: string;
  boardArchitecture: string;
  boardBuild: string;
  boardBuildType: string;
  boardConfigLabel: string;
  boardConfigFileName: string;
  // The board config this firmware was compiled for (e.g. "Pico",
  // "OpenCore0") — distinct from boardConfigLabel, which is a user-editable
  // display name and so isn't reliable for matching a known board. Used to
  // pick the right pin layout (see Data/dc/layouts.ts).
  boardConfig: string;
}

interface ConnectionState {
  status: ConnectionStatus;
  controllerName: string;
  controllerInfo: ControllerInfo | null;
  // The device's current USB input mode (the console it emulates), read from
  // the same getGamepadOptions poll that checks reachability. null until known
  // or while disconnected.
  inputMode: number | null;
  checkConnection: (fetchImpl?: typeof fetch) => Promise<ConnectionStatus>;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: 'searching',
  controllerName: '',
  controllerInfo: null,
  inputMode: null,
  checkConnection: async (fetchImpl = fetch) => {
    // useConnectionMonitor calls this on a timer even while already
    // connected, just to re-validate. Unconditionally flipping to
    // 'searching' here made the banner visibly blip (green -> grey -> green)
    // on every routine poll tick — only show it while we don't already know
    // we're connected, so a background re-check that succeeds is silent.
    if (get().status !== 'connected') {
      set({ status: 'searching' });
    }
    try {
      const res = await fetchImpl(`${baseUrl}/api/getGamepadOptions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const next: ConnectionStatus = res.ok ? 'connected' : 'lost';

      if (next === 'connected') {
        try {
          const body = await res.json();
          set({
            inputMode: Number.isInteger(body?.inputMode) ? body.inputMode : null,
          });
        } catch {
          // The body is a bonus on top of reachability; keep the last known mode.
        }
      }

      if (next === 'connected' && !get().controllerName) {
        try {
          const info = await fetchImpl(`${baseUrl}/api/getFirmwareVersion`).then(
            (r) => r.json(),
          );
          set({
            controllerName: info.boardConfigLabel ?? '',
            controllerInfo: {
              version: info.version ?? '',
              boardArchitecture: info.boardArchitecture ?? '',
              boardBuild: info.boardBuild ?? '',
              boardBuildType: info.boardBuildType ?? '',
              boardConfigLabel: info.boardConfigLabel ?? '',
              boardConfigFileName: info.boardConfigFileName ?? '',
              boardConfig: info.boardConfig ?? '',
            },
          });
        } catch {
          // Controller name is a nice-to-have; connection status still stands without it.
        }
      } else if (next !== 'connected') {
        set({ controllerName: '', controllerInfo: null, inputMode: null });
      }

      set({ status: next });
      return next;
    } catch {
      set({
        status: 'lost',
        controllerName: '',
        controllerInfo: null,
        inputMode: null,
      });
      return 'lost';
    }
  },
}));
