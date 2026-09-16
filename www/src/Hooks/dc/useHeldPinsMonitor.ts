import { useEffect, useState } from 'react';
// @ts-expect-error - WebApi.js is untyped JS
import WebApi from '../../Services/WebApi';

type HeldPinsApi = {
  getHeldPins: (
    signal?: AbortSignal,
  ) => Promise<{ heldPins?: number[]; canceled?: boolean } | undefined>;
  abortGetHeldPins: () => Promise<void> | void;
};

const defaultApi: HeldPinsApi = {
  getHeldPins: WebApi.getHeldPins,
  abortGetHeldPins: WebApi.abortGetHeldPins,
};

export function useHeldPinsMonitor(
  enabled = true,
  api: HeldPinsApi = defaultApi,
): number[] {
  const [heldPins, setHeldPins] = useState<number[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    const loop = async () => {
      while (active) {
        let res;
        try {
          res = await api.getHeldPins(controller.signal);
        } catch {
          res = undefined;
        }
        if (!active) break;
        if (res && !res.canceled && Array.isArray(res.heldPins)) {
          setHeldPins(res.heldPins);
        }
        // Small gap so an immediately-resolving/erroring endpoint can't hot-loop.
        await new Promise((r) => setTimeout(r, 50));
      }
    };
    loop();
    return () => {
      active = false;
      controller.abort();
      api.abortGetHeldPins();
    };
  }, [enabled, api]);
  return heldPins;
}
