import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useConnectionStore } from './useConnectionStore';

beforeEach(() => {
  useConnectionStore.setState({
    status: 'searching',
    controllerName: '',
    controllerInfo: null,
  });
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

  it('captures the full firmware description from getFirmwareVersion on connect', async () => {
    const fakeFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('getFirmwareVersion')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            version: 'v0.7.12',
            boardArchitecture: 'rp2040',
            boardBuild: '0014e4a',
            boardBuildType: 'Release',
            boardConfigLabel: 'Pico',
            boardConfigFileName: 'GP2040-CE_0.7.12_Pico',
            boardConfig: 'Pico',
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    await useConnectionStore
      .getState()
      .checkConnection(fakeFetch as unknown as typeof fetch);
    expect(useConnectionStore.getState().controllerInfo).toEqual({
      version: 'v0.7.12',
      boardArchitecture: 'rp2040',
      boardBuild: '0014e4a',
      boardBuildType: 'Release',
      boardConfigLabel: 'Pico',
      boardConfigFileName: 'GP2040-CE_0.7.12_Pico',
      boardConfig: 'Pico',
    });
  });

  it('clears the controller name and info when the connection is lost', async () => {
    useConnectionStore.setState({
      controllerName: 'Pico',
      controllerInfo: {
        version: 'v0.7.12',
        boardArchitecture: 'rp2040',
        boardBuild: '0014e4a',
        boardBuildType: 'Release',
        boardConfigLabel: 'Pico',
        boardConfigFileName: 'GP2040-CE_0.7.12_Pico',
        boardConfig: 'Pico',
      },
    });
    const fakeFetch = vi.fn().mockRejectedValue(new Error('network'));
    await useConnectionStore
      .getState()
      .checkConnection(fakeFetch as unknown as typeof fetch);
    expect(useConnectionStore.getState().controllerName).toBe('');
    expect(useConnectionStore.getState().controllerInfo).toBeNull();
  });

  it('sets lost on a network error', async () => {
    const fakeFetch = vi.fn().mockRejectedValue(new Error('network'));
    const result = await useConnectionStore
      .getState()
      .checkConnection(fakeFetch as unknown as typeof fetch);
    expect(result).toBe('lost');
    expect(useConnectionStore.getState().status).toBe('lost');
  });

  it('does not flash back to "searching" on a routine re-check while already connected', async () => {
    // useConnectionMonitor calls this every 5s. Unconditionally flipping to
    // 'searching' at the start of every call made the banner visibly blip
    // (green -> grey -> green) on every poll tick, more noticeably whenever
    // the board was slow to respond — exactly the "quick refresh" reported
    // as correlating with connection activity.
    useConnectionStore.setState({ status: 'connected' });
    const statuses: string[] = [];
    const unsubscribe = useConnectionStore.subscribe((s) => statuses.push(s.status));
    const fakeFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    await useConnectionStore
      .getState()
      .checkConnection(fakeFetch as unknown as typeof fetch);
    unsubscribe();
    expect(statuses).not.toContain('searching');
  });

  it('still shows "searching" while checking when not already connected', async () => {
    useConnectionStore.setState({ status: 'lost' });
    const statuses: string[] = [];
    const unsubscribe = useConnectionStore.subscribe((s) => statuses.push(s.status));
    const fakeFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    await useConnectionStore
      .getState()
      .checkConnection(fakeFetch as unknown as typeof fetch);
    unsubscribe();
    expect(statuses).toContain('searching');
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
