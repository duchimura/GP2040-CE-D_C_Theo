import { create } from 'zustand';
// @ts-expect-error - WebApi.js is untyped JS
import { baseUrl } from '../Services/WebApi';

export type ConnectionStatus = 'searching' | 'connected' | 'lost';

interface ConnectionState {
  status: ConnectionStatus;
  checkConnection: (fetchImpl?: typeof fetch) => Promise<ConnectionStatus>;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'searching',
  checkConnection: async (fetchImpl = fetch) => {
    set({ status: 'searching' });
    try {
      const res = await fetchImpl(`${baseUrl}/api/getGamepadOptions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const next: ConnectionStatus = res.ok ? 'connected' : 'lost';
      set({ status: next });
      return next;
    } catch {
      set({ status: 'lost' });
      return 'lost';
    }
  },
}));
