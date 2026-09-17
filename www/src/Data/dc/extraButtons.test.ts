import { describe, it, expect } from 'vitest';
import { computeExtraPlacements } from './extraButtons';
import { getLayout, rightCluster } from './layouts';

const CLUSTER_CENTER_X =
  (Math.min(...rightCluster.map((p) => p.x - p.r)) +
    Math.max(...rightCluster.map((p) => p.x + p.r))) /
  2;

describe('computeExtraPlacements', () => {
  it('returns nothing when only the standard pins are wired', () => {
    const standardActions: Record<number, number> = {};
    for (const p of getLayout('leverless').placements) standardActions[p.defaultPin] = 1;
    expect(computeExtraPlacements('leverless', standardActions)).toEqual([]);
  });

  it('detects a wired pin outside the standard layout', () => {
    const result = computeExtraPlacements('leverless', { 16: 13 }); // BUTTON_PRESS_S1
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ key: 'extra-16', defaultPin: 16, action: 13 });
  });

  it('excludes unassigned (NONE) and addon-assigned (0) pins', () => {
    const result = computeExtraPlacements('leverless', { 24: -10, 28: 0 });
    expect(result).toEqual([]);
  });

  it('excludes pins already part of the standard layout', () => {
    const standardPin = getLayout('leverless').placements[0].defaultPin;
    const result = computeExtraPlacements('leverless', { [standardPin]: 1 });
    expect(result).toEqual([]);
  });

  it('excludes pins already part of a different board\'s standard layout when boardConfig is given', () => {
    // OpenCore0's Up is pin 12 — not one of Pico's standard 12, so without
    // board-awareness this would be misreported as an "extra" button.
    const result = computeExtraPlacements('leverless', { 12: 1 }, 'OpenCore0');
    expect(result).toEqual([]);
  });

  it('orders extra buttons by pin number and wraps to a new row past 6 per row', () => {
    const actions: Record<number, number> = {};
    const pins = [30, 16, 17, 18, 19, 25, 26, 27]; // 8 extra pins, unsorted input
    for (const pin of pins) actions[pin] = 13;
    const result = computeExtraPlacements('leverless', actions);
    expect(result.map((p) => p.defaultPin)).toEqual(
      [...pins].sort((a, b) => a - b),
    );
    // First 6 share a row (same y), the 7th starts a new row below it.
    expect(result[0].y).toBe(result[5].y);
    expect(result[6].y).toBeGreaterThan(result[0].y);
  });

  it('centers a single extra button under the 8-button cluster', () => {
    const result = computeExtraPlacements('leverless', { 16: 13 });
    expect(result[0].x).toBeCloseTo(CLUSTER_CENTER_X);
  });

  it('centers a full row of extra buttons under the 8-button cluster', () => {
    const actions: Record<number, number> = {};
    for (const pin of [16, 17, 18, 19, 20, 21]) actions[pin] = 13;
    const result = computeExtraPlacements('leverless', actions);
    const rowCenter = (result[0].x + result[result.length - 1].x) / 2;
    expect(rowCenter).toBeCloseTo(CLUSTER_CENTER_X);
  });

  it('centers a shorter final row independently of the full rows above it', () => {
    const actions: Record<number, number> = {};
    // 8 pins: a full row of 6, then a shorter row of 2.
    for (const pin of [16, 17, 18, 19, 20, 21, 22, 23]) actions[pin] = 13;
    const result = computeExtraPlacements('leverless', actions);
    const lastRow = result.slice(6);
    const rowCenter = (lastRow[0].x + lastRow[lastRow.length - 1].x) / 2;
    expect(rowCenter).toBeCloseTo(CLUSTER_CENTER_X);
  });

  describe('mirrored', () => {
    it('re-centers under the cluster\'s new (mirrored) position, on the opposite side', () => {
      const pins = [16, 17, 18, 19, 20, 21];
      const actions: Record<number, number> = {};
      for (const pin of pins) actions[pin] = 13;

      const normal = computeExtraPlacements('leverless', actions);
      const mirrored = computeExtraPlacements('leverless', actions, undefined, true);

      const centerOf = (r: typeof normal) => (r[0].x + r[r.length - 1].x) / 2;
      expect(centerOf(mirrored)).not.toBeCloseTo(centerOf(normal));
      // The cluster itself moved to the left when mirrored (see layouts.test.ts),
      // so the extra-button block should now sit to the left of its normal spot.
      expect(centerOf(mirrored)).toBeLessThan(centerOf(normal));
    });

    it('keeps extra buttons in the same left-to-right pin order — moved, not mirrored', () => {
      const pins = [30, 16, 17, 18, 19, 25]; // unsorted input, as elsewhere in this file
      const actions: Record<number, number> = {};
      for (const pin of pins) actions[pin] = 13;

      const normal = computeExtraPlacements('leverless', actions);
      const mirrored = computeExtraPlacements('leverless', actions, undefined, true);

      // Same pins, same left-to-right ORDER in both — only the block's anchor
      // moved. If mirroring had also flipped their internal arrangement, this
      // order (and the relative x spacing pattern) would reverse.
      expect(mirrored.map((p) => p.defaultPin)).toEqual(normal.map((p) => p.defaultPin));
      const normalGaps = normal.slice(1).map((p, i) => p.x - normal[i].x);
      const mirroredGaps = mirrored.slice(1).map((p, i) => p.x - mirrored[i].x);
      expect(mirroredGaps).toEqual(normalGaps);
    });
  });
});
