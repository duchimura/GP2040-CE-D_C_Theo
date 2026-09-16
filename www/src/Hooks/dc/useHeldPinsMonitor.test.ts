import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHeldPinsMonitor } from './useHeldPinsMonitor';

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
});
