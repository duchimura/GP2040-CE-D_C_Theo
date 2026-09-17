import { create } from 'zustand';
// @ts-expect-error - WebApi.js is untyped JS
import { baseUrl } from '../Services/WebApi';

export type ConnectionStatus = 'searching' | 'connected' | 'lost';

interface ConnectionState {
  status: ConnectionStatus;
  controllerName: string;
  checkConnection: (fetchImpl?: typeof fetch) => Promise<ConnectionStatus>;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: 'searching',
  controllerName: '',
  checkConnection: async (fetchImpl = fetch) => {
    set({ status: 'searching' });
    try {
      const res = await fetchImpl(`${baseUrl}/api/getGamepadOptions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const next: ConnectionStatus = res.ok ? 'connected' : 'lost';

      if (next === 'connected' && !get().controllerName) {
        try {
          const info = await fetchImpl(`${baseUrl}/api/getFirmwareVersion`).then(
            (r) => r.json(),
          );
          set({ controllerName: info.boardConfigLabel ?? '' });
        } catch {
          // Controller name is a nice-to-have; connection status still stands without it.
        }
      } else if (next !== 'connected') {
        set({ controllerName: '' });
      }

      set({ status: next });
      return next;
    } catch {
      set({ status: 'lost', controllerName: '' });
      return 'lost';
    }
  },
}));
