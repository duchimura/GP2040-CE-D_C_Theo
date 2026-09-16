import { describe, it, expect } from 'vitest';
import { profileToMappedButtons, actionsByPin } from './profileMapping';
import { BUTTON_ACTIONS } from '../Pins';
import type { PinsType } from '../../Store/useProfilesStore';

const profile = {
  profileLabel: 'Profile 1',
  enabled: true,
  pin06: {
    action: BUTTON_ACTIONS.BUTTON_PRESS_B1,
    customButtonMask: 0,
    customDpadMask: 0,
  },
  pin07: { action: BUTTON_ACTIONS.NONE, customButtonMask: 0, customDpadMask: 0 },
} as unknown as PinsType;

describe('profileMapping', () => {
  it('maps wired buttons and drops NONE', () => {
    expect(profileToMappedButtons(profile)).toEqual([
      { pin: 6, action: BUTTON_ACTIONS.BUTTON_PRESS_B1, buttonKey: 'B1' },
    ]);
  });
  it('actionsByPin returns every pin action', () => {
    expect(actionsByPin(profile)).toEqual({
      6: BUTTON_ACTIONS.BUTTON_PRESS_B1,
      7: BUTTON_ACTIONS.NONE,
    });
  });
});
