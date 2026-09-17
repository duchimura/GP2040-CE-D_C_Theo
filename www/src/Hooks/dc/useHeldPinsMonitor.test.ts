import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHeldPinsMonitor, REQUEST_TIMEOUT_MS } from './useHeldPinsMonitor';

describe('useHeldPinsMonitor', () => {
  it('polls getHeldPins and exposes heldPins, aborting on unmount', async () => {
    const getHeldPins = vi.fn().mockResolvedValue({ heldPins: [7] });
    const abortGetHeldPins = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() =>
      useHeldPinsMonitor(true, { getHeldPins, abortGetHeldPins }),
    );
    await waitFor(() => expect(result.current).toEqual([7]));
    expect(getHeldPins).toHaveBeenCalled();
    unmount();
    expect(abortGetHeldPins).toHaveBeenCalled();
  });

  it('does not poll when disabled', () => {
    const getHeldPins = vi.fn();
    const abortGetHeldPins = vi.fn();
    renderHook(() => useHeldPinsMonitor(false, { getHeldPins, abortGetHeldPins }));
    expect(getHeldPins).not.toHaveBeenCalled();
  });

  it('flashes a reported press then clears it, instead of staying lit until the next cycle', async () => {
    // A response only ever arrives after the reported pin was released (or
    // after an idle timeout), so it must never be shown as a persistent
    // "currently held" state.
    let callCount = 0;
    const getHeldPins = vi.fn(() => {
      callCount += 1;
      if (callCount === 1) return Promise.resolve({ heldPins: [5] });
      return new Promise(() => {}); // never resolves — nothing else happens in this test
    });
    const abortGetHeldPins = vi.fn().mockResolvedValue(undefined);
    // A stable `api` reference matters: an inline object literal here would
    // be a new reference every re-render (e.g. after setHeldPins), which
    // would change the effect's dependency array and restart it constantly.
    const api = { getHeldPins, abortGetHeldPins };

    const { result, unmount } = renderHook(() => useHeldPinsMonitor(true, api));

    await waitFor(() => expect(result.current).toEqual([5]));
    await waitFor(() => expect(result.current).toEqual([]));

    unmount();
  });

  it('abandons a hung request after a timeout and retries, without calling abortGetHeldPins', async () => {
    // A connection can die/hang well before the firmware's own idle timeout —
    // observed even mid-hold on real hardware. abortGetHeldPins is NOT called
    // here: if the connection is already dead, there's nothing left
    // server-side to tell to stop, and an earlier attempt at this made things
    // worse by adding that extra request on every timeout.
    vi.useFakeTimers();
    try {
      let callCount = 0;
      const signals: (AbortSignal | undefined)[] = [];
      const getHeldPins = vi.fn((signal?: AbortSignal) => {
        callCount += 1;
        signals.push(signal);
        if (callCount === 1) {
          return new Promise((_resolve, reject) => {
            signal?.addEventListener('abort', () => reject(new Error('AbortError')));
          });
        }
        return Promise.resolve({ heldPins: [] });
      });
      const abortGetHeldPins = vi.fn().mockResolvedValue(undefined);
      const api = { getHeldPins, abortGetHeldPins };

      const { unmount } = renderHook(() => useHeldPinsMonitor(true, api));

      await vi.advanceTimersByTimeAsync(0);
      expect(getHeldPins).toHaveBeenCalledTimes(1);
      expect(signals[0]?.aborted).toBe(false);

      await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
      expect(signals[0]?.aborted).toBe(true);
      expect(abortGetHeldPins).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(50);
      expect(getHeldPins).toHaveBeenCalledTimes(2);

      unmount();
      // Unmount still calls it, as a best-effort cleanup for a live connection.
      expect(abortGetHeldPins).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the per-request timeout comfortably above the firmware\'s ~5s idle window', () => {
    // A timeout shorter than the firmware's own long-poll idle window means
    // the client aborts nearly every idle cycle before the board would have
    // replied on its own — a likely contributor to the board's connection
    // pool getting exhausted over a sustained session. Guard against this
    // silently drifting back down.
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThan(5000);
  });
});
