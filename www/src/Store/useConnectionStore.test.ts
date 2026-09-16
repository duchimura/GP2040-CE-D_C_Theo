import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useConnectionStore } from './useConnectionStore';

beforeEach(() => {
  useConnectionStore.setState({ status: 'searching' });
});

describe('useConnectionStore.checkConnection', () => {
  it('sets connected on a successful response', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const result = await useConnectionStore
      .getState()
      .checkConnection(fakeFetch as unknown as typeof fetch);
    expect(result).toBe('connected');
    expect(useConnectionStore.getState().status).toBe('connected');
  });

  it('sets lost on a network error', async () => {
    const fakeFetch = vi.fn().mockRejectedValue(new Error('network'));
    const result = await useConnectionStore
      .getState()
      .checkConnection(fakeFetch as unknown as typeof fetch);
    expect(result).toBe('lost');
    expect(useConnectionStore.getState().status).toBe('lost');
  });

  it('sets lost on a non-ok response', async () => {
    const fakeFetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const result = await useConnectionStore
      .getState()
      .checkConnection(fakeFetch as unknown as typeof fetch);
    expect(result).toBe('lost');
  });
});
