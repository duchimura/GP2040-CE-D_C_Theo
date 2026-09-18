import { describe, it, expect } from 'vitest';
import { getLayout, LAYOUT_STYLES } from './layouts';

describe('getLayout', () => {
  it('defines both styles with placements', () => {
    expect(LAYOUT_STYLES).toEqual(['leverless', 'arcadeStick']);
    for (const style of LAYOUT_STYLES) {
      expect(getLayout(style).placements.length).toBeGreaterThan(0);
    }
  });
  it('has finite coordinates and unique keys per layout', () => {
    for (const style of LAYOUT_STYLES) {
      const keys = new Set<string>();
      for (const p of getLayout(style).placements) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y) && p.r > 0).toBe(true);
        expect(keys.has(p.key)).toBe(false);
        keys.add(p.key);
      }
    }
  });
  it('includes the 4 directions and B1-B4 in both layouts', () => {
    for (const style of LAYOUT_STYLES) {
      const keys = getLayout(style).placements.map((p) => p.key);
      for (const k of ['Up', 'Down', 'Left', 'Right', 'B1', 'B2', 'B3', 'B4']) {
        expect(keys).toContain(k);
      }
    }
  });

  it('falls back to the Pico wiring for an unrecognized or missing boardConfig', () => {
    const withNoBoard = getLayout('leverless');
    const withUnknownBoard = getLayout('leverless', 'SomeCustomOneOffBoard');
    const byKey = (placements: typeof withNoBoard.placements) =>
      Object.fromEntries(placements.map((p) => [p.key, p.defaultPin]));
    expect(byKey(withUnknownBoard.placements)).toEqual(byKey(withNoBoard.placements));
    // configs/Pico/BoardConfig.h's own wiring.
    expect(byKey(withNoBoard.placements)).toMatchObject({
      Up: 2, Down: 3, Right: 4, Left: 5,
      B1: 6, B2: 7, R2: 8, L2: 9,
      B3: 10, B4: 11, R1: 12, L1: 13,
    });
  });

  it('matches boardConfig case-insensitively', () => {
    const lower = getLayout('leverless', 'opencore0');
    const mixed = getLayout('leverless', 'OpenCore0');
    expect(lower.placements).toEqual(mixed.placements);
  });

  it('uses a known board\'s own wiring instead of the default when it genuinely differs', () => {
    // configs/OpenCore0/BoardConfig.h — a real board whose fixed-12 wiring is
    // completely different from Pico's.
    const placements = getLayout('leverless', 'OpenCore0').placements;
    const byKey = Object.fromEntries(placements.map((p) => [p.key, p.defaultPin]));
    expect(byKey).toEqual({
      Up: 12, Down: 10, Right: 11, Left: 9,
      B1: 13, B2: 14, R2: 15, L2: 16,
      B3: 17, B4: 18, R1: 19, L1: 20,
    });
  });

  it('uses MavercadeRev2\'s own wiring instead of the Pico fallback', () => {
    // configs/MavercadeRev2/BoardConfig.h — the D-pad and cluster are wired
    // to different pins than Pico's default, so without this entry the
    // visualizer looked at Pico's (unwired, on this board) D-pad pins and
    // rendered the real D-pad as unrecognized "extra" buttons instead.
    const placements = getLayout('leverless', 'MavercadeRev2').placements;
    const byKey = Object.fromEntries(placements.map((p) => [p.key, p.defaultPin]));
    expect(byKey).toEqual({
      Up: 11, Down: 8, Right: 10, Left: 7,
      B1: 12, B2: 17, R2: 18, L2: 9,
      B3: 16, B4: 14, R1: 15, L1: 19,
    });
  });

  it('the same board wiring applies across both layout styles (style only changes x/y)', () => {
    const leverless = getLayout('leverless', 'MiSTercadeV2');
    const arcade = getLayout('arcadeStick', 'MiSTercadeV2');
    const byKey = (p: typeof leverless.placements) =>
      Object.fromEntries(p.map((x) => [x.key, x.defaultPin]));
    expect(byKey(leverless.placements)).toEqual(byKey(arcade.placements));
  });

  describe('mirrored', () => {
    const CLUSTER_KEYS = ['B1', 'B2', 'B3', 'B4', 'L1', 'L2', 'R1', 'R2'];
    const DIRECTION_KEYS = ['Up', 'Down', 'Left', 'Right'];

    it('wiring (pin per key) is unaffected — mirroring only moves the shape', () => {
      for (const style of LAYOUT_STYLES) {
        const normal = getLayout(style, 'OpenCore0');
        const mirrored = getLayout(style, 'OpenCore0', true);
        const byKey = (p: typeof normal.placements) =>
          Object.fromEntries(p.map((x) => [x.key, x.defaultPin]));
        expect(byKey(mirrored.placements)).toEqual(byKey(normal.placements));
      }
    });

    it('swaps sides: the 8-button cluster moves to where the directions were, and vice versa', () => {
      for (const style of LAYOUT_STYLES) {
        const normal = getLayout(style);
        const mirrored = getLayout(style, undefined, true);
        const xOf = (placements: typeof normal.placements, keys: string[]) =>
          placements.filter((p) => keys.includes(p.key)).map((p) => p.x);

        const normalClusterMinX = Math.min(...xOf(normal.placements, CLUSTER_KEYS));
        const normalDirectionsMaxX = Math.max(...xOf(normal.placements, DIRECTION_KEYS));
        const mirroredClusterMaxX = Math.max(...xOf(mirrored.placements, CLUSTER_KEYS));
        const mirroredDirectionsMinX = Math.min(...xOf(mirrored.placements, DIRECTION_KEYS));

        // Directions were entirely left of the cluster; mirrored, the
        // cluster is entirely left of the directions (d-pad on the right).
        expect(normalDirectionsMaxX).toBeLessThan(normalClusterMinX);
        expect(mirroredClusterMaxX).toBeLessThan(mirroredDirectionsMinX);
      }
    });

    it('mirrors the cluster\'s own internal left-right arrangement, not just its side', () => {
      // L1 sits outermost-right in the normal cluster; mirrored, its
      // counterpart position should be outermost-left, not just translated.
      const normal = getLayout('leverless');
      const mirrored = getLayout('leverless', undefined, true);
      const l1Normal = normal.placements.find((p) => p.key === 'L1')!;
      const b3Normal = normal.placements.find((p) => p.key === 'B3')!;
      const l1Mirrored = mirrored.placements.find((p) => p.key === 'L1')!;
      const b3Mirrored = mirrored.placements.find((p) => p.key === 'B3')!;
      // Normally L1 is to the right of B3 within the cluster; mirrored, that
      // left-right relationship between them flips.
      expect(l1Normal.x).toBeGreaterThan(b3Normal.x);
      expect(l1Mirrored.x).toBeLessThan(b3Mirrored.x);
    });

    it('is idempotent to toggle off — mirrored: false matches the default', () => {
      const a = getLayout('leverless');
      const b = getLayout('leverless', undefined, false);
      expect(b).toEqual(a);
    });
  });
});
