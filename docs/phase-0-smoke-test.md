# Phase 0 Smoke Test

Phase 0 proves the pipeline end-to-end. The automated portion runs in CI and
locally; the hardware portion must be run by a human on a real board.

## Automated (runs anywhere)

```bash
cd www
npm ci
npm test          # Vitest — all suites pass
npm run build     # proto -> Vite -> makefsdata; regenerates lib/httpd/fsdata.c
npm run size-check # bundle within flash budget
```

Expected: every step exits 0.

## Dev-server check (no hardware)

```bash
cd www
npm run dev
```

Open <http://localhost:3000/dc/settings>. Expected: the connection banner
renders at the top; the General Settings page loads an input-mode value from the
mock server; clicking **Save** shows a "Saved" (or "Save failed") status.

## Hardware smoke test (human-run — cannot be automated here)

Requires a real RP2040 fight-stick board and the firmware toolchain.

1. [ ] Build the firmware `.uf2` per the upstream build docs (this repo's
       toolchain / Pico SDK).
2. [ ] Enter BOOTSEL mode and flash the `.uf2` to the board (drag-and-drop to
       the `RPI-RP2` drive).
3. [ ] Enter web-config (hold the config button / plug in) and open
       <http://192.168.7.1>.
4. [ ] Navigate to `/dc/settings`. Confirm the connection banner shows
       **"Controller connected"**.
5. [ ] Change the input mode, click **Save**, then power-cycle the board,
       reconnect, and confirm the value **persisted**.
6. [ ] Flash the stock `.uf2` per [`revert-to-stock.md`](revert-to-stock.md) and
       confirm the **original interface returns**.

Passing all six confirms Phase 0: a from-scratch UI layer, built on the new
design system, reads and writes real device config and ships in a flashable
image with a clean path back to stock.
