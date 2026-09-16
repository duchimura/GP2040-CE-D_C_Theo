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

import { useProfilesView } from './useProfilesView';

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
});
