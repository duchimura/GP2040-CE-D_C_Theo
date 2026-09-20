import { describe, it, expect } from 'vitest';
import { faceStyleFor } from './faceButtons';

describe('faceStyleFor', () => {
  it('gives PlayStation sets a shape and color per face button', () => {
    for (const set of ['ps3', 'ps4']) {
      expect(faceStyleFor(set, 'B1')?.shape).toBe('cross');
      expect(faceStyleFor(set, 'B2')?.shape).toBe('circle');
      expect(faceStyleFor(set, 'B3')?.shape).toBe('square');
      expect(faceStyleFor(set, 'B4')?.shape).toBe('triangle');
    }
    const colors = ['B1', 'B2', 'B3', 'B4'].map((k) => faceStyleFor('ps4', k)?.color);
    expect(new Set(colors).size).toBe(4);
  });

  it('keeps Xbox letters but colors them (no shape)', () => {
    expect(faceStyleFor('xinput', 'B1')).toEqual({ color: expect.any(String) });
    const colors = ['B1', 'B2', 'B3', 'B4'].map((k) => faceStyleFor('xinput', k)?.color);
    expect(colors.every(Boolean)).toBe(true);
    expect(new Set(colors).size).toBe(4);
    expect(faceStyleFor('xinput', 'B1')?.shape).toBeUndefined();
  });

  it('styles nothing else', () => {
    expect(faceStyleFor('switch', 'B1')).toBeUndefined();
    expect(faceStyleFor('gp2040', 'B1')).toBeUndefined();
    expect(faceStyleFor('ps4', 'L1')).toBeUndefined();
    expect(faceStyleFor('xinput', 'Up')).toBeUndefined();
    expect(faceStyleFor('nope', 'B1')).toBeUndefined();
  });
});
