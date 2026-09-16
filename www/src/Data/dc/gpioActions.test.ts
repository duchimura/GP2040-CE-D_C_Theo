import { describe, it, expect } from 'vitest';
import { buttonKeyForAction } from './gpioActions';
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
