import { describe, it, expect, vi } from 'vitest';
import { loadControllerMapping } from './useControllerMapping';
import { BUTTON_ACTIONS } from '../../Data/Pins';

describe('loadControllerMapping', () => {
  it('normalizes pinNN entries into MappedButton[] and drops unmapped/none', async () => {
    const api = {
      getPinMappings: vi.fn().mockResolvedValue({
        profileLabel: 'Profile 1',
        enabled: true,
        pin00: { action: BUTTON_ACTIONS.BUTTON_PRESS_B1 },
        pin07: { action: BUTTON_ACTIONS.BUTTON_PRESS_UP },
        pin09: { action: BUTTON_ACTIONS.NONE },
      }),
    };
    const result = await loadControllerMapping(api);
    expect(result).toEqual(
      expect.arrayContaining([
        { pin: 0, action: BUTTON_ACTIONS.BUTTON_PRESS_B1, buttonKey: 'B1' },
        { pin: 7, action: BUTTON_ACTIONS.BUTTON_PRESS_UP, buttonKey: 'Up' },
      ]),
    );
    expect(result).toHaveLength(2); // NONE dropped
  });
});
