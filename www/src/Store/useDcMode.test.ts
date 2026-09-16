import { describe, it, expect, beforeEach } from 'vitest';
import { useDcMode, readInitialDcMode } from './useDcMode';

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
});

describe('useDcMode', () => {
  it('defaults to enabled', () => {
    expect(readInitialDcMode()).toBe(true);
  });
  it('toggle flips and persists', () => {
    useDcMode.setState({ enabled: true });
    useDcMode.getState().toggle();
    expect(useDcMode.getState().enabled).toBe(false);
    expect(localStorage.getItem('dc.mode')).toBe('off');
  });
  it('readInitialDcMode reads a stored off value', () => {
    localStorage.setItem('dc.mode', 'off');
    expect(readInitialDcMode()).toBe(false);
  });
});
