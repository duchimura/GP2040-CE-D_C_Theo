import { describe, it, expect } from 'vitest';
import {
  buttonKeyForAction,
  actionForButtonKey,
  ASSIGNABLE_FUNCTIONS,
} from './gpioActions';
import { BUTTON_ACTIONS } from '../Pins';

describe('buttonKeyForAction', () => {
  it('maps known button actions to layout keys', () => {
    expect(buttonKeyForAction(BUTTON_ACTIONS.BUTTON_PRESS_B1)).toBe('B1');
    expect(buttonKeyForAction(BUTTON_ACTIONS.BUTTON_PRESS_UP)).toBe('Up');
    expect(buttonKeyForAction(BUTTON_ACTIONS.BUTTON_PRESS_R2)).toBe('R2');
  });
  it('returns null for non-rendered actions', () => {
    expect(buttonKeyForAction(BUTTON_ACTIONS.NONE)).toBeNull();
    expect(buttonKeyForAction(999999)).toBeNull();
  });
});

describe('actionForButtonKey', () => {
  it('is the inverse of buttonKeyForAction for all assignable functions', () => {
    for (const key of ASSIGNABLE_FUNCTIONS) {
      expect(buttonKeyForAction(actionForButtonKey(key))).toBe(key);
    }
  });
  it('lists the directions and B1-B4', () => {
    for (const k of ['Up', 'Down', 'Left', 'Right', 'B1', 'B2', 'B3', 'B4']) {
      expect(ASSIGNABLE_FUNCTIONS).toContain(k);
    }
  });
});
