import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useConnectionStore } from '../../Store/useConnectionStore';
import { useConnectionMonitor } from './useConnectionMonitor';

afterEach(() => {
  vi.useRealTimers();
});

describe('useConnectionMonitor', () => {
  it('checks on mount and on each interval, and stops on unmount', () => {
    vi.useFakeTimers();
    const spy = vi.fn().mockResolvedValue('connected');
    useConnectionStore.setState({ checkConnection: spy });

    const { unmount } = renderHook(() => useConnectionMonitor(1000));
    expect(spy).toHaveBeenCalledTimes(1); // on mount

    vi.advanceTimersByTime(1000);
    expect(spy).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(1000);
    expect(spy).toHaveBeenCalledTimes(3);

    unmount();
    vi.advanceTimersByTime(3000);
    expect(spy).toHaveBeenCalledTimes(3); // no more calls after unmount
  });
});
