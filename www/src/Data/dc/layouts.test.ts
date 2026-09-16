import { describe, it, expect } from 'vitest';
import { LAYOUTS, LAYOUT_STYLES } from './layouts';

describe('LAYOUTS', () => {
  it('defines both styles with a viewBox and placements', () => {
    expect(LAYOUT_STYLES).toEqual(['leverless', 'arcadeStick']);
    for (const style of LAYOUT_STYLES) {
      const layout = LAYOUTS[style];
      expect(layout.viewBox).toMatch(/^\d+ \d+ \d+ \d+$/);
      expect(layout.placements.length).toBeGreaterThan(0);
    }
  });
  it('has finite coordinates and unique keys per layout', () => {
    for (const style of LAYOUT_STYLES) {
      const keys = new Set<string>();
      for (const p of LAYOUTS[style].placements) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y) && p.r > 0).toBe(true);
        expect(keys.has(p.key)).toBe(false);
        keys.add(p.key);
      }
    }
  });
  it('includes the 4 directions and B1-B4 in both layouts', () => {
    for (const style of LAYOUT_STYLES) {
      const keys = LAYOUTS[style].placements.map((p) => p.key);
      for (const k of ['Up', 'Down', 'Left', 'Right', 'B1', 'B2', 'B3', 'B4']) {
        expect(keys).toContain(k);
      }
    }
  });
});
