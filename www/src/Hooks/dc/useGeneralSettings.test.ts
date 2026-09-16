import { describe, it, expect, vi } from 'vitest';
import {
  loadGeneralSettings,
  validateGeneralSettings,
  saveGeneralSettings,
} from './useGeneralSettings';

describe('validateGeneralSettings', () => {
  it('accepts valid settings', () => {
    expect(validateGeneralSettings({ inputMode: 4, dpadMode: 0, socdMode: 2 })).toEqual([]);
  });
  it('rejects out-of-range inputMode', () => {
    const errs = validateGeneralSettings({ inputMode: 99, dpadMode: 0, socdMode: 0 });
    expect(errs.length).toBeGreaterThan(0);
  });
  it('rejects negative dpadMode', () => {
    const errs = validateGeneralSettings({ inputMode: 0, dpadMode: -1, socdMode: 0 });
    expect(errs.length).toBeGreaterThan(0);
  });
});

describe('loadGeneralSettings', () => {
  it('maps the three fields from getGamepadOptions', async () => {
    const api = {
      getGamepadOptions: vi
        .fn()
        .mockResolvedValue({ inputMode: 4, dpadMode: 1, socdMode: 2, extra: 9 }),
      setGamepadOptions: vi.fn(),
    };
    const s = await loadGeneralSettings(api);
    expect(s).toEqual({ inputMode: 4, dpadMode: 1, socdMode: 2 });
  });

  it('passes a setLoading callback (stock WebApi requires one)', async () => {
    const api = {
      getGamepadOptions: vi.fn().mockResolvedValue({ inputMode: 0, dpadMode: 0, socdMode: 0 }),
      setGamepadOptions: vi.fn(),
    };
    await loadGeneralSettings(api);
    expect(api.getGamepadOptions).toHaveBeenCalledWith(expect.any(Function));
  });
});

describe('saveGeneralSettings', () => {
  it('calls setGamepadOptions for valid settings', async () => {
    const api = { getGamepadOptions: vi.fn(), setGamepadOptions: vi.fn().mockResolvedValue({}) };
    await saveGeneralSettings({ inputMode: 4, dpadMode: 0, socdMode: 0 }, api);
    expect(api.setGamepadOptions).toHaveBeenCalledWith(
      expect.objectContaining({ inputMode: 4, dpadMode: 0, socdMode: 0 }),
    );
  });
  it('throws on invalid settings and does not call the API', async () => {
    const api = { getGamepadOptions: vi.fn(), setGamepadOptions: vi.fn() };
    await expect(
      saveGeneralSettings({ inputMode: 99, dpadMode: 0, socdMode: 0 }, api),
    ).rejects.toThrow('invalid');
    expect(api.setGamepadOptions).not.toHaveBeenCalled();
  });
});
