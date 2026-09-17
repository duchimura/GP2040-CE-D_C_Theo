import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useConnectionStore } from './useConnectionStore';

beforeEach(() => {
  useConnectionStore.setState({ status: 'searching', controllerName: '' });
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

  it('captures the controller name from getFirmwareVersion on connect', async () => {
    const fakeFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('getFirmwareVersion')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ boardConfigLabel: 'Pico' }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    await useConnectionStore
      .getState()
      .checkConnection(fakeFetch as unknown as typeof fetch);
    expect(useConnectionStore.getState().controllerName).toBe('Pico');
  });

  it('clears the controller name when the connection is lost', async () => {
    useConnectionStore.setState({ controllerName: 'Pico' });
    const fakeFetch = vi.fn().mockRejectedValue(new Error('network'));
    await useConnectionStore
      .getState()
      .checkConnection(fakeFetch as unknown as typeof fetch);
    expect(useConnectionStore.getState().controllerName).toBe('');
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
