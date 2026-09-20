import { describe, it, expect } from 'vitest';
import { shortLabel } from './shortLabels';

describe('shortLabel', () => {
  it("shortens PS4's 'Touchpad Center' to fit an extra-button circle", () => {
    expect(shortLabel('Touchpad Center')).toBe('TPad');
  });

  it('leaves every other label untouched', () => {
    expect(shortLabel('Cross')).toBe('Cross');
    expect(shortLabel('Options')).toBe('Options');
    expect(shortLabel('')).toBe('');
  });
});
