import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const store = {
  profiles: [
    {
      profileLabel: 'P1',
      enabled: true,
      pin06: { action: 5, customButtonMask: 0, customDpadMask: 0 },
    },
  ],
  loadingProfiles: false,
  fetchProfiles: vi.fn(),
  saveProfiles: vi.fn().mockResolvedValue({}),
  setProfilePin: vi.fn(),
  setProfileLabel: vi.fn(),
  addProfile: vi.fn(),
  toggleProfileEnabled: vi.fn(),
  copyBaseProfile: vi.fn(),
};
vi.mock('../../Store/useProfilesStore', () => ({
  __esModule: true,
  MAX_PROFILES: 6,
  default: Object.assign((sel: (s: typeof store) => unknown) => sel(store), {
    getState: () => store,
  }),
}));

import { useProfilesView, PROFILE_LOAD_TIMEOUT_MS } from './useProfilesView';

beforeEach(() => vi.clearAllMocks());

describe('useProfilesView', () => {
  it('exposes mapping for the selected profile and assigns via the store', async () => {
    const { result } = renderHook(() => useProfilesView());
    await act(async () => {
      await result.current.load();
    });
    expect(result.current.currentMapping).toEqual([
      { pin: 6, action: 5, buttonKey: 'B1' },
    ]);
    act(() => result.current.assignFunctionToPin(6, 6));
    expect(store.setProfilePin).toHaveBeenCalledWith(
      0,
      'pin06',
      expect.objectContaining({ action: 6 }),
    );
    expect(result.current.dirty).toBe(true);
  });
  it('save calls saveProfiles and clears dirty', async () => {
    const { result } = renderHook(() => useProfilesView());
    await act(async () => {
      await result.current.load();
    });
    act(() => result.current.rename('New'));
    expect(store.setProfileLabel).toHaveBeenCalledWith(0, 'New');
    await act(async () => {
      await result.current.save();
    });
    expect(store.saveProfiles).toHaveBeenCalled();
    expect(result.current.dirty).toBe(false);
  });

  it('load surfaces an error instead of hanging forever when the board never responds', async () => {
    // The real board's httpd has been observed to swallow a request with no
    // response at all (connection exhausted/wedged) — fetchProfiles then
    // never settles. Without a bound here, the UI would sit on "waiting for
    // controller" forever with no way to tell the user or let them retry.
    vi.useFakeTimers();
    try {
      store.fetchProfiles.mockImplementationOnce(() => new Promise(() => {}));
      const { result } = renderHook(() => useProfilesView());

      let loadPromise: Promise<void>;
      act(() => {
        loadPromise = result.current.load();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(PROFILE_LOAD_TIMEOUT_MS);
        await loadPromise;
      });

      expect(result.current.error).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
