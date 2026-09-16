import { describe, it, expect } from 'vitest';

describe('test harness', () => {
  it('runs and has jsdom document', () => {
    expect(typeof document).toBe('object');
    expect(1 + 1).toBe(2);
  });
});
