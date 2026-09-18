# GP2040-CE-D_C_Theo — Board Wiring Auto-Generation — Design Spec

- **Date:** 2026-09-18
- **Status:** Approved design
- **Repo:** `github.com/duchimura/GP2040-CE-D_C_Theo`
- **Builds on:** the controller view's `Data/dc/layouts.ts` (fixed-12 shapes + per-board
  `BoardWiring` tables), added in earlier phases; the `MavercadeRev2` wiring entry added by
  hand this session after a live-hardware mismatch was diagnosed.

## 1. Purpose

`layouts.ts`'s `BOARD_WIRINGS` table (which GPIO pin lands in which of the visualizer's fixed
12 slots — the 4 directions + 8-button cluster) is hand-maintained today, one board at a time.
Only 4 of 57 boards in `configs/` have an entry; every other board silently falls back to
`PICO_WIRING`, which is wrong whenever that board's real wiring differs — exactly the bug hit
live on a Mavercade Rev2 (`KeebWarrior`) unit this session: its D-pad is wired to pins 7/8/10/11,
but the visualizer looked at pins 2/3/4/5 (unwired on this board) and rendered the D-pad as
unrecognized "extra" buttons instead.

This phase replaces hand-maintenance with a build-time generator that reads every board's own
`configs/<Board>/BoardConfig.h` — the firmware's own source of truth — and produces the wiring
table automatically, so all boards with a conventional fixed-12 wiring get correct visualizer
positions with no manual step, and new boards are picked up the next time someone builds.

## 2. Scope

**In scope:**
- A Node generator script that parses `configs/*/BoardConfig.h` for the fixed-12
  `GPIO_PIN_xx GpioAction::BUTTON_PRESS_*` macros and emits a generated wiring table.
- Wiring the generator into the existing build pipeline (`start`/`build` npm scripts),
  alongside `build-proto`.
- A small manual-override layer in `layouts.ts` for any future board the heuristic gets wrong.
- A "Loading button map…" placeholder in `ControllerViewPage` for the (currently silent,
  Pico-defaulted) gap before the first successful device connection resolves `boardConfig`.

**Out of scope (deferred):**
- Per-board custom *shapes* (as opposed to wiring). 16/57 boards embed `GP_ELEMENT_PIN_BUTTON`
  coordinate blocks (used today for their on-device OLED display) that could in principle drive
  genuinely custom visualizer shapes instead of the two generic ones (`leverless`/
  `arcadeStick`). Explicitly deferred — this phase is wiring-only, matching the two shapes
  already in `layouts.ts`.
- Any firmware (C++) changes.
- Boards without a conventional fixed-12 macro set (see §4, Exclusions).

## 3. Grounding (facts verified this session)

- **`boardConfig` == the `configs/` folder name, always.** `CMakeLists.txt` sets
  `GP2040_BOARDCONFIG` from the folder under `configs/` used to build (`set(GP2040_BOARDCONFIG
  ...)`, `PICO_BOARD_HEADER_DIRS = configs/${GP2040_BOARDCONFIG}`) and compiles it in verbatim
  as the `GP2040_BOARDCONFIG` macro, which `webconfig.cpp` writes into `getFirmwareVersion`'s
  `boardConfig` field unmodified. So matching a live device's reported `boardConfig` to a
  `configs/` folder is exact-string (case-insensitive), never fuzzy.
- **55 of 57 boards** with a `BoardConfig.h` define all four
  `GpioAction::BUTTON_PRESS_(UP|DOWN|LEFT|RIGHT)` macros in the simple `#define GPIO_PIN_xx
  GpioAction::BUTTON_PRESS_*` style `layouts.ts` already expects. The two exceptions —
  `Blank` (template stub, no real hardware) and `GranolaBeacon` (a non-controller accessory
  board whose one `BUTTON_PRESS_UP` macro is an unrelated `HETRIGGER_HE10_ACTION` alias, not a
  D-pad) — have no real fixed-12 wiring and should fall back to `PICO_WIRING`, same as today.
- **10 of 57 boards** wire a function to more than one physical pin (e.g. `MavercadeRev2`'s
  `GPIO_PIN_11`/`GPIO_PIN_20` both `BUTTON_PRESS_UP`; `Granola`'s duplicated cluster under an
  "Additional accessibility inputs" comment block). In every surveyed case, the pin listed
  **first in the file** is the primary/canonical one and the later duplicate is a labeled
  secondary/accessibility input — confirmed by reading the surrounding comments in `Granola`,
  `Haute42COSMOX`, and the `Mavercade*` series.
- **`MavercadeRev2` ground truth** (used as the regression case, §6): live device
  `getPinMappings`/`getFirmwareVersion` this session confirmed `Up:11, Down:8, Right:10,
  Left:7`, matching `configs/MavercadeRev2/BoardConfig.h` exactly, which is what I hand-entered
  into `layouts.ts` earlier this session.
- **Generated files are already committed in this repo**, not gitignored: `src_gen/enums.ts`
  (from `build-proto`) is tracked in git. The new generated file follows the same convention.

## 4. Architecture & Components

### Generator script
- `www/scripts/genBoardWirings.js` (Node, CommonJS, matching `makefsdata.js`'s style).
- For each `configs/<Board>/BoardConfig.h`:
  - Regex-extract all lines matching
    `/^#define GPIO_PIN_(\d+)\s+GpioAction::BUTTON_PRESS_(UP|DOWN|LEFT|RIGHT|B[1-4]|L[12]|R[12])\b/`.
  - Group by function key; **first match in file order wins** when a key appears more than
    once (§3).
  - **Exclusion rule:** skip the board (no entry emitted; falls back to `PICO_WIRING` at
    lookup time, same as an unrecognized board today) unless all of `Up`, `Down`, `Left`,
    `Right` were found. This is a general rule, not a `Blank`/`GranolaBeacon` special case —
    it naturally excludes both, and any future non-controller board shaped the same way.
  - Key casing matches `layouts.ts`'s existing `ButtonPlacement.key` values exactly (`Up`,
    `Down`, `Left`, `Right`, `B1`..`B4`, `L1`, `L2`, `R1`, `R2`).
- Output: `www/src_gen/boardWirings.ts`, a generated file (header comment: "generated by
  `scripts/genBoardWirings.js` — do not hand-edit", matching `enums.ts`'s existing convention
  referenced in `CLAUDE.md`) exporting:
  ```ts
  export const GENERATED_BOARD_WIRINGS: Record<string, Record<string, number>> = { ... };
  ```
  keyed by the lowercased `configs/` folder name.

### Build wiring
- New npm script in `www/package.json`: `"gen-board-wirings": "node scripts/genBoardWirings.js"`.
- Prepended into `start` and `build`, alongside `build-proto`:
  `"start": "npm run build-proto && npm run gen-board-wirings && vite"` (and equivalently in
  `build`). Runs on every dev/build invocation — always in sync, no separate maintenance step.
- Output is committed to git (tracked, like `enums.ts`), so it's reviewable in diffs when
  `configs/` changes, even though it's regenerated automatically.

### `layouts.ts` integration
- `BOARD_WIRINGS` becomes:
  ```ts
  const BOARD_WIRINGS: Record<string, BoardWiring> = {
    ...GENERATED_BOARD_WIRINGS,
    ...MANUAL_WIRING_OVERRIDES, // empty today; escape hatch for a future bad heuristic call
  };
  ```
- `PICO_WIRING` stays as the hand-defined fallback constant it already is (used both as the
  `getLayout` fallback for any board absent from the table, and as `Pico`'s own generated
  entry — the two should always agree, since the generator reads `configs/Pico/BoardConfig.h`
  the same way as any other board).
- The now-redundant hand-written `MAVERCADE_REV2_WIRING` constant (added earlier this session)
  is removed; its board is now covered by the generated table instead.

### Loading UX (`ControllerViewPage`)
- Today: before the first successful connection resolves, `boardConfig` is `undefined` and the
  page silently renders using `PICO_WIRING` — a real, if brief, wrong-layout flash for any
  non-Pico board.
- Change: while `useConnectionStore`'s `status !== 'connected'` (already read in this
  component for an unrelated effect), render a lightweight "Loading button map…" placeholder
  in place of the visualizer instead of a guessable-wrong default. Once `status === 'connected'`
  (which, per `useConnectionStore`, only happens after `controllerInfo.boardConfig` is already
  populated — see that store's `checkConnection`), the real layout renders directly; there's no
  separate "board known but layout still loading" state to handle, since the lookup itself is a
  synchronous table read.

## 5. Data Flow

```
build/dev time:
  npm run start / build
    -> build-proto (existing)
    -> gen-board-wirings: scan configs/*/BoardConfig.h
                          -> extract fixed-12 macros per board
                          -> first-occurrence-wins on duplicates
                          -> skip boards missing any of Up/Down/Left/Right
                          -> write src_gen/boardWirings.ts
    -> vite (bundles the generated table in)

runtime (browser):
  ControllerViewPage mounts, connectionStatus = 'searching'
    -> render "Loading button map…" placeholder
  useConnectionStore.checkConnection() resolves 'connected'
    (controllerInfo.boardConfig already set by this point)
    -> getLayout(style, boardConfig, mirrored)
         -> BOARD_WIRINGS[boardConfig.toLowerCase()] ?? PICO_WIRING
    -> visualizer renders with correct per-board pin positions
```

## 6. Testing

- **Unit (Vitest), `scripts/genBoardWirings.test.js`:**
  - Extraction function pulls the 12 expected keys from a fixture string matching the real
    `#define GPIO_PIN_xx GpioAction::BUTTON_PRESS_*` style, including trailing comment tables.
  - First-occurrence-wins: a fixture with a function defined twice keeps the first pin.
  - Exclusion: a fixture missing any of `Up`/`Down`/`Left`/`Right` (e.g. `GranolaBeacon`-style)
    produces no entry for that board.
  - Board-key casing: folder name is lowercased for the output map's keys.
- **Regression, against the real `configs/` tree:**
  - Running the generator's extraction against `configs/MavercadeRev2/BoardConfig.h` produces
    exactly `{ Up: 11, Down: 8, Right: 10, Left: 7, B1: 12, B2: 17, R2: 18, L2: 9, B3: 16,
    B4: 14, R1: 15, L1: 19 }` — the same values hand-verified against the live device this
    session.
  - Running it against the full `configs/` tree produces entries for all boards surveyed as
    having the simple macro style (55), and none for `Blank`/`GranolaBeacon`.
- **Existing `layouts.test.ts`:** the `MavercadeRev2` test added earlier this session is kept
  unchanged — it now exercises the generated table (via `layouts.ts`'s import) instead of a
  hand-written constant, proving the generator reproduces the hand-verified values.
- **Manual:** `npm run build` (or `start`) regenerates `src_gen/boardWirings.ts`; spot-check a
  board with duplicate-pin wiring (e.g. `Granola`) picks the primary block, not the
  accessibility block.

## 7. Constraints (inherited)

- No firmware (C++) changes; the generator only *reads* `configs/*/BoardConfig.h`, never writes
  to it.
- `lint:dc` doesn't cover `scripts/` (it's outside `src/**/dc/`); the generator is plain Node,
  not part of the linted UI surface — same treatment as `makefsdata.js`/`check-bundle-size.js`.
- Keep `npm test`, `npm run build`, and `npm run size-check` green.

## 8. Open Questions / Risks

- **Heuristic correctness for boards not yet surveyed in detail:** "first occurrence wins" was
  verified against all 10 currently-known duplicate-function boards, but a future board could
  genuinely intend the *second* listed pin as primary. Mitigation: the `MANUAL_WIRING_OVERRIDES`
  escape hatch in `layouts.ts` (§4) exists precisely for this; no generator change needed to fix
  a single board.
- **Boards with a fixed-12 macro set that isn't a real gamepad D-pad** (like `GranolaBeacon`):
  the all-4-directions-present rule is a coarse filter. If a future board defines all 4
  directions but still isn't a real gamepad, it would be silently included; this hasn't been
  observed in the current 57 boards.
