# Phase 1A Smoke Test — Interactive Controller View

## Automated (runs anywhere)

```bash
cd www
npm ci
npm test          # all suites pass
npm run build     # proto -> Vite -> makefsdata
npm run size-check # bundle within flash budget
```

## Dev-server check (no hardware)

```bash
cd www
npm run dev
```

Open <http://localhost:3000/dc/controller>. Expected:
- The controller SVG renders; each mapped button shows its **label + `P<pin>`** from the
  mock `getPinMappings`.
- The **Leverless / Arcade Stick** selector switches the layout; the choice **persists**
  across reload (localStorage).
- Against the mock, `getHeldPins` returns `[7]`, so the button mapped to GPIO 7 lights up
  periodically (press-to-identify behavior).
- The **D_C_Theo Version** toggle in the top bar now lands on `/dc/controller`.

## Hardware smoke test (human-run — cannot be automated here)

1. [ ] Build the firmware `.uf2` and flash a real board (see upstream build docs).
2. [ ] Open `http://192.168.7.1/dc/controller` in web-config mode.
3. [ ] Confirm each button shows its label + GPIO pin from the device's real mapping.
4. [ ] Pick the layout style matching your build; confirm it persists on reload.
5. [ ] Press physical buttons; confirm the correct on-screen button lights up
       (press-to-identify), including unlabeled buttons.
