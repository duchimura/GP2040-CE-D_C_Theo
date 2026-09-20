import { describe, it, expect } from 'vitest';
import { fitFontSize } from './fitLabel';

describe('fitFontSize', () => {
  it('keeps the base size for a label that already fits', () => {
    expect(fitFontSize('L1', 50)).toBe(13);
  });

  it('shrinks a label that would overflow, until it fits', () => {
    const size = fitFontSize('Share', 34);
    expect(size).toBeLessThan(13);
    // Estimated width (~0.62em per char) must not exceed the space available.
    expect(5 * 0.62 * size).toBeLessThanOrEqual(34);
  });

  it("shrinks 'Options' to the floor, leaving it inside a 40px circle", () => {
    const size = fitFontSize('Options', 34);
    expect(size).toBe(8);
    expect(7 * 0.62 * size).toBeLessThan(40);
  });

  it('never goes below the minimum size, even for hopeless labels', () => {
    expect(fitFontSize('Touchpad Center', 34)).toBe(8);
  });

  it('handles an empty label', () => {
    expect(fitFontSize('', 34)).toBe(13);
  });
});
