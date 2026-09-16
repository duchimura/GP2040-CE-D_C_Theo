import { describe, it, expect, vi } from 'vitest';
import { applyMappingChanges, saveRemap } from './applyMappingChanges';

const raw = {
  profileLabel: 'Profile 1',
  enabled: true,
  pin06: { action: 5, customButtonMask: 0, customDpadMask: 0 },
  pin07: { action: 6, customButtonMask: 0, customDpadMask: 0 },
};

describe('applyMappingChanges', () => {
  it('sets only the given pins actions and preserves everything else', () => {
    const out = applyMappingChanges(raw, { 6: 6 }) as typeof raw;
    expect(out.pin06.action).toBe(6);
    expect(out.pin06.customButtonMask).toBe(0);
    expect(out.pin07.action).toBe(6); // unchanged
    expect(out.profileLabel).toBe('Profile 1');
    expect(out.enabled).toBe(true);
    expect(raw.pin06.action).toBe(5); // original not mutated
  });
});

describe('saveRemap', () => {
  it('reads fresh mapping, applies changes, and writes', async () => {
    const api = {
      getPinMappings: vi.fn().mockResolvedValue(raw),
      setPinMappings: vi.fn().mockResolvedValue(true),
    };
    await saveRemap({ 6: 6 }, api);
    expect(api.getPinMappings).toHaveBeenCalled();
    expect(api.setPinMappings).toHaveBeenCalledWith(
      expect.objectContaining({ pin06: expect.objectContaining({ action: 6 }) }),
    );
  });
});
