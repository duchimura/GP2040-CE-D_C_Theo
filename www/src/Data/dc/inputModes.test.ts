import { describe, it, expect } from 'vitest';
import { INPUT_MODES, isValidInputMode } from './inputModes';

describe('inputModes', () => {
  it('lists all firmware input modes 0..17', () => {
    expect(INPUT_MODES.map((m) => m.value)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
    ]);
  });

  it('accepts modes across the full range (incl. 14-17 that the old cap rejected)', () => {
    expect(isValidInputMode(4)).toBe(true);
    expect(isValidInputMode(17)).toBe(true);
  });

  it('rejects unknown, negative, and config (255) values', () => {
    expect(isValidInputMode(99)).toBe(false);
    expect(isValidInputMode(-1)).toBe(false);
    expect(isValidInputMode(255)).toBe(false);
  });
});
