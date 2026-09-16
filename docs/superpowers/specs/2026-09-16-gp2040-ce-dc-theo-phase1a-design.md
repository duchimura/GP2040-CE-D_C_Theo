# GP2040-CE-D_C_Theo — Phase 1A — Interactive Controller View + Press-to-Identify — Design Spec

- **Date:** 2026-09-16
- **Status:** Approved design (Phase 1A scope)
- **Repo:** `github.com/duchimura/GP2040-CE-D_C_Theo`
- **Branch:** `phase-1a-controller-view` (off `phase-0-foundation`)
- **Builds on:** Phase 0 foundation (Tailwind/Radix design system, connection store/banner,
  typed WebApi usage, `/dc/*` interface + D_C_Theo toggle).

## 1. Purpose

Solve the "unlabeled buttons" problem: most fight sticks have no printed labels, so a
user cannot tell which physical button is B1/Square or which GPIO it is wired to. Phase 1A
delivers an **interactive controller view** that, on startup, shows every button on a
picture of the controller **labeled with its logical name and assigned GPIO pin**, and
lights up a button when the user **presses it physically** (press-to-identify).

This is the first sub-project of Phase 1. It is **display + identify only** — it does not
write any configuration to the device.

## 2. Scope

**In scope:**
- Two interactive SVG controller layouts: **leverless** (WASD-style directions + buttons)
  and **arcade stick** (joystick + buttons), covering the common GP2040 builds.
- Auto-populate the layout from the device: each on-screen button shows its **logical
  label** (using the app's existing label sets / `buttonLabels`) and its **assigned GPIO
  pin**.
- **Press-to-identify:** long-poll `getHeldPins`; light up the on-screen button(s) whose
  mapped pin is currently held.
- **Layout selection:** auto-select by board when recognized; otherwise the user picks a
  style, remembered per-browser in `localStorage`.

**Out of scope (explicitly deferred):**
- Writing/reassigning pin mappings to the device (a later sub-project, 1A.2).
- A smooth continuous multi-button live visualizer (Phase 1B; needs firmware streaming).
- Per-commercial-controller photoreal art (later; 1A ships two generic SVG styles).
- Any firmware C++ changes.

## 3. Grounding (existing API + data — reused, not reinvented)

- `getPinMappings()` → `{ profileLabel, enabled, pin00: { action, customButtonMask,
  customDpadMask }, pin01: {...}, ... }`. `action` is a **GpioAction** enum number.
- `getBoardDefinition()` → the board pin definition (`.pico` shape: min/max pin, analog
  pins, etc.), used to know valid pins and, where possible, the board identity.
- `getHeldPins(abortSignal)` → `{ heldPins: number[] }`; **blocks** until a pin is held
  (mock delays ~2s), with `abortGetHeldPins()` and abort-signal support
  (returns `{ canceled: true }` on abort). Ideal for press-to-identify.
- **GpioAction enum** (`proto/enums.proto`): `BUTTON_PRESS_UP=1 … RIGHT=4`, `B1=5 … B4=8`,
  `L1=9,R1=10,L2=11,R2=12`, `S1=13,S2=14`, `A1=15,A2=16`, `L3=17,R3=18`, plus extras.
- **`src/Data/Buttons.js`** already defines label sets (gp2040/arcade/console); the
  `buttonLabels` context holds the user's chosen set. Phase 1A reuses these for labels
  (e.g. B3 → "Square" under a PlayStation label set).

## 4. Architecture & Components

New page **`/dc/controller`** (the D_C_Theo landing view), composed of focused units:

### Data
- `src/Data/dc/gpioActions.ts` — bidirectional map between GpioAction enum numbers and
  logical button keys (`Up`,`Down`,`Left`,`Right`,`B1`–`B4`,`L1`,`R1`,`L2`,`R2`,`S1`,`S2`,
  `A1`,`A2`,`L3`,`R3`). Only the keys the layouts render need positions; unknown actions
  are ignored for display.
- `src/Data/dc/layouts.ts` — for each layout style (`leverless`, `arcadeStick`): an array
  of `{ buttonKey, x, y, r }` placements (SVG coordinates + radius) plus a `viewBox`.

### Hooks
- `src/Hooks/dc/useControllerMapping.ts`
  - `loadControllerMapping(api?)` → `Promise<MappedButton[]>` where
    `MappedButton = { pin: number; action: number; buttonKey: string }`.
    Reads `getPinMappings`, parses `pinNN` keys to pin numbers, maps `action` →
    `buttonKey` (via gpioActions), drops entries with no known button key or action ≤ 0.
- `src/Hooks/dc/useHeldPinsMonitor.ts`
  - React hook that runs a long-poll loop calling `getHeldPins(signal)`; on each resolve
    with `{ heldPins }` it updates state and immediately re-polls; aborts on unmount and
    calls `abortGetHeldPins()`. Exposes `heldPins: number[]`.

### Components
- `src/Components/dc/ControllerLayout.tsx` — props: `layoutStyle`, `mapping:
  MappedButton[]`, `heldPins: number[]`, `labelFor(buttonKey) => string`. Renders the SVG
  for the style; for each placement, draws the button with its **label + pin** and applies
  a **held** visual state when its pin ∈ `heldPins`. Each button has
  `data-testid="ctrl-btn-<buttonKey>"` and `data-held="true|false"`.
- `src/Components/dc/LayoutStyleSelector.tsx` — Radix/Tailwind toggle between `leverless`
  and `arcadeStick`; persists to `localStorage` (wrapped in try/catch).
- `src/Pages/dc/ControllerViewPage.tsx` — loads mapping on mount, resolves the label set
  from the `buttonLabels` context, chooses the layout (board-recognized → default; else
  remembered/selected), runs `useHeldPinsMonitor`, and renders `LayoutStyleSelector` +
  `ControllerLayout`. Shows a "waiting for controller…" state if the mapping fails to load.

### Wiring
- Add route `/dc/controller` in `App.tsx`; make the D_C_Theo toggle land on
  `/dc/controller` (update the toggle target from `/dc/settings` to `/dc/controller`), and
  add a link to `/dc/settings` from the new view or nav.

## 5. Data Flow (press-to-identify)

```
mount
  → loadControllerMapping()   (getPinMappings + gpioActions)
  → render ControllerLayout with labels + pins
  → useHeldPinsMonitor starts:
        loop: getHeldPins(signal) --blocks--> { heldPins }
              set heldPins state → ControllerLayout highlights matching buttons
              re-poll
        unmount: abort signal + abortGetHeldPins()
```

Pressing a physical button → its GPIO appears in `heldPins` → the on-screen button whose
mapped pin equals that GPIO lights up, revealing its label + pin.

## 6. Error Handling

- Connection lost is surfaced by the existing Phase 0 connection banner; additionally the
  view renders a "waiting for controller…" placeholder until the first mapping load
  succeeds.
- `getHeldPins` returning `{ canceled: true }` (abort) is ignored; the loop stops on
  unmount. A failed `getHeldPins` call is retried on the next loop tick (bounded by a small
  delay to avoid a hot error loop).
- `localStorage` access is wrapped in try/catch; the layout selector still works without it.

## 7. Testing

- **Unit (Vitest):**
  - `gpioActions`: action↔key mapping is correct and round-trips for the rendered keys.
  - `layouts`: every `buttonKey` used by a layout resolves to a gpioAction key; each layout
    has a `viewBox` and non-overlapping-ish placements (at least: every placement has
    finite x/y/r).
  - `useControllerMapping.loadControllerMapping`: normalizes a mocked `getPinMappings`
    payload into `MappedButton[]`, parsing `pinNN` and dropping unmapped/`action<=0` pins.
  - `useHeldPinsMonitor`: polls on mount, updates `heldPins` from a mocked `getHeldPins`,
    re-polls, and stops/aborts on unmount (mocked timers).
- **Component (RTL):**
  - `ControllerLayout`: renders labels + pins for a given mapping; a button whose pin is in
    `heldPins` has `data-held="true"`, others `false`.
  - `ControllerViewPage`: loads mapping on mount and renders the selected layout; switching
    the style selector changes the rendered layout.
- **Manual (documented):** on hardware / mock — open `/dc/controller`, confirm buttons show
  labels + pins, press a physical button and confirm the correct on-screen button lights
  up.

## 8. Constraints (inherited)

- Bundle-size budget (CI) still applies; SVG layouts are inline vector (no bitmaps).
- Tailwind (`tw-` prefix) + Radix; coexists with stock Bootstrap.
- Reuse existing `WebApi` default-export functions and `Data/Buttons` label sets.
- No firmware changes.

## 9. Open Questions / Risks

- **Board→layout auto-selection** is best-effort: for a bare Pico the board is not a
  specific enclosure, so auto-select falls back to the remembered/user-picked style. Only
  recognized commercial boards can pin a default style; Phase 1A ships the fallback and a
  simple recognized-board hook point, not a full board→style table.
- **`getHeldPins` latency:** blocking one-shot means press-to-identify is one/few presses
  at a time, not a smooth multi-press stream — acceptable and intended for identify;
  smooth continuous visualization is Phase 1B.
- **Layout accuracy:** two generic SVG layouts won't match every physical build exactly;
  they convey topology (which button is which), which is what identify needs. Per-brand art
  is deferred.
