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

// A response only ever arrives *after* the reported pins were released (the
// firmware's loop returns once state goes back to how it was when the
// request started, or after an idle timeout with nothing pressed) — it can
// never report a still-ongoing hold. So a non-empty result is a "this was
// just pressed" event, not a persistent state: without clearing it back out
// client-side, the UI would show it lit until the next (possibly
// many-seconds-later) poll cycle comes back — a button that looks stuck lit
// well after it was actually released. This is purely a local timer, no
// extra network calls, so it doesn't add any load to the board.
const FLASH_MS = 400;

// The connection can die on its own (observed even mid-hold on real hardware),
// leaving the loop waiting on an already-dead request instead of starting a
// fresh one that might catch the next press/release. Give each attempt a
// bound so a hung connection gets abandoned locally and retried quickly —
// unlike an earlier attempt at this, this does NOT also call
// abortGetHeldPins() on timeout: that added a second request per timeout and
// made things worse. If the connection is already dead, there's nothing left
// server-side to tell to stop.
//
// This MUST stay comfortably above the firmware's own ~5s idle timeout for
// an empty (nothing held) response. It was previously 3000ms — shorter than
// that 5s window — which meant the client was aborting nearly every idle
// poll cycle *before* the firmware's own long-poll would have returned
// naturally, not just on a genuinely dead connection. Aborting a connection
// the board still considers in-progress, on essentially every cycle, is a
// strong candidate for the board's connection pool getting exhausted over a
// sustained session (see connection-drop investigation).
export const REQUEST_TIMEOUT_MS = 7000;

export function useHeldPinsMonitor(
  enabled = true,
  api: HeldPinsApi = defaultApi,
): number[] {
  const [heldPins, setHeldPins] = useState<number[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let currentController: AbortController | null = null;
    let flashTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const loop = async () => {
      while (active) {
        const controller = new AbortController();
        currentController = controller;
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        let res;
        try {
          res = await api.getHeldPins(controller.signal);
        } catch {
          res = undefined;
        }
        clearTimeout(timeoutId);

        if (!active) break;
        if (res && !res.canceled && Array.isArray(res.heldPins)) {
          setHeldPins(res.heldPins);
          if (flashTimeoutId) clearTimeout(flashTimeoutId);
          if (res.heldPins.length > 0) {
            flashTimeoutId = setTimeout(() => {
              if (active) setHeldPins([]);
            }, FLASH_MS);
          }
        }
        // Small gap so an immediately-resolving/erroring endpoint can't hot-loop.
        await new Promise((r) => setTimeout(r, 50));
      }
    };
    loop();
    return () => {
      active = false;
      if (flashTimeoutId) clearTimeout(flashTimeoutId);
      currentController?.abort();
      api.abortGetHeldPins();
    };
  }, [enabled, api]);
  return heldPins;
}
