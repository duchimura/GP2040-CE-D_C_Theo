import { describe, it, expect } from 'vitest';
import { initRemapState, assignFunction, pendingPins } from './useRemapState';

const mapping = [
  { pin: 6, action: 5, buttonKey: 'B1' as const },
  { pin: 7, action: 6, buttonKey: 'B2' as const },
];

describe('useRemapState', () => {
  it('seeds working actions from the snapshot and is not dirty', () => {
    const s = initRemapState(mapping);
    expect(s.workingActions).toEqual({ 6: 5, 7: 6 });
    expect(s.dirty).toBe(false);
  });
  it('assignFunction overwrites one pin and sets dirty', () => {
    let s = initRemapState(mapping);
    s = assignFunction(s, 6, 6); // pin 6 -> action 6 (B2)
    expect(s.workingActions[6]).toBe(6);
    expect(s.workingActions[7]).toBe(6); // untouched, duplicate allowed
    expect(s.dirty).toBe(true);
    expect(pendingPins(s)).toEqual([6]);
  });
  it('reverting a pin to its original action clears dirty', () => {
    let s = initRemapState(mapping);
    s = assignFunction(s, 6, 6);
    s = assignFunction(s, 6, 5); // back to original
    expect(s.dirty).toBe(false);
    expect(pendingPins(s)).toEqual([]);
  });
});
