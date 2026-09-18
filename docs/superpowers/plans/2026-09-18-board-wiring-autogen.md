# Board Wiring Auto-Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-maintained `BOARD_WIRINGS` table in `www/src/Data/dc/layouts.ts`
(4/57 boards covered) with a build-time generator that reads every board's own
`configs/<Board>/BoardConfig.h` and produces correct fixed-12-slot pin wiring automatically,
so any board using the conventional macro style gets a correct visualizer layout with no
manual step.

**Architecture:** A new Node ESM script (`www/scripts/genBoardWirings.js`) regex-parses
`configs/*/BoardConfig.h` files for `GPIO_PIN_xx GpioAction::BUTTON_PRESS_*` macros and emits
a generated TypeScript file (`www/src_gen/boardWirings.ts`, committed to git like the existing
`src_gen/enums.ts`). `layouts.ts` imports the generated table instead of hand-written constants.
A small manual-override layer stays available for future edge cases. Separately,
`ControllerViewPage` gets a "Loading button map…" placeholder for the narrow window where
profile data has loaded but the connected board's identity hasn't resolved yet, so it never
silently renders the Pico-default layout for an unrecognized board.

**Tech Stack:** Node (ESM, `"type": "module"`), TypeScript, Vitest, React 18.

**Spec:** `docs/superpowers/specs/2026-09-18-board-wiring-autogen-design.md`

## Global Constraints

- No firmware (C++) changes — the generator only *reads* `configs/*/BoardConfig.h`.
- Generated files are committed to git, not gitignored (matches `src_gen/enums.ts`).
- `scripts/` is plain Node, not covered by `npm run lint:dc` (same as `makefsdata.js`,
  `scripts/check-bundle-size.js`) — no lint step needed for `genBoardWirings.js` itself.
- New/changed files under `src/**/dc/` must pass `npm run lint:dc` (`--max-warnings 0`).
- All new D_C_Theo UI strings go through the `DC` i18n namespace (`src/Locales/en/DC.jsx`).
- Keep `npm test`, `npm run lint:dc`, `npm run build`, and `npm run size-check` green
  throughout; commit after each task.
- TDD: write the failing test before the implementation for every step below.

---

## Task 1: `extractBoardWiring` — parse one board's macros

**Files:**
- Create: `www/scripts/genBoardWirings.js`
- Test: `www/scripts/genBoardWirings.test.js`

**Interfaces:**
- Produces: `extractBoardWiring(contents: string): Record<string, number> | null` — exported
  named function. Returns a map with some/all of the keys `Up`, `Down`, `Left`, `Right`, `B1`,
  `B2`, `B3`, `B4`, `L1`, `L2`, `R1`, `R2` → GPIO pin number, or `null` if any of `Up`/`Down`/
  `Left`/`Right` is missing.

- [ ] **Step 1: Write the failing tests**

Create `www/scripts/genBoardWirings.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { extractBoardWiring } from './genBoardWirings.js';

describe('extractBoardWiring', () => {
  it('extracts all 12 fixed-slot keys from conventional BoardConfig.h macros', () => {
    const contents = `
#define GPIO_PIN_02 GpioAction::BUTTON_PRESS_UP     // UP
#define GPIO_PIN_03 GpioAction::BUTTON_PRESS_DOWN   // DOWN
#define GPIO_PIN_04 GpioAction::BUTTON_PRESS_RIGHT  // RIGHT
#define GPIO_PIN_05 GpioAction::BUTTON_PRESS_LEFT   // LEFT
#define GPIO_PIN_06 GpioAction::BUTTON_PRESS_B1     // B1
#define GPIO_PIN_07 GpioAction::BUTTON_PRESS_B2     // B2
#define GPIO_PIN_08 GpioAction::BUTTON_PRESS_R2     // R2
#define GPIO_PIN_09 GpioAction::BUTTON_PRESS_L2     // L2
#define GPIO_PIN_10 GpioAction::BUTTON_PRESS_B3     // B3
#define GPIO_PIN_11 GpioAction::BUTTON_PRESS_B4     // B4
#define GPIO_PIN_12 GpioAction::BUTTON_PRESS_R1     // R1
#define GPIO_PIN_13 GpioAction::BUTTON_PRESS_L1     // L1
`;
    expect(extractBoardWiring(contents)).toEqual({
      Up: 2, Down: 3, Right: 4, Left: 5,
      B1: 6, B2: 7, R2: 8, L2: 9,
      B3: 10, B4: 11, R1: 12, L1: 13,
    });
  });

  it('keeps the first pin when a function is wired twice, like a labeled secondary input', () => {
    const contents = `
#define GPIO_PIN_11 GpioAction::BUTTON_PRESS_UP     // UP
#define GPIO_PIN_08 GpioAction::BUTTON_PRESS_DOWN   // DOWN
#define GPIO_PIN_10 GpioAction::BUTTON_PRESS_RIGHT  // RIGHT
#define GPIO_PIN_07 GpioAction::BUTTON_PRESS_LEFT   // LEFT

// Additional accessibility inputs
#define GPIO_PIN_20 GpioAction::BUTTON_PRESS_UP     // UP
`;
    expect(extractBoardWiring(contents)?.Up).toBe(11);
  });

  it('returns null when any of the 4 directions is missing (not a real D-pad board)', () => {
    const contents = `
#define GPIO_PIN_02 GpioAction::BUTTON_PRESS_UP     // UP
#define GPIO_PIN_03 GpioAction::BUTTON_PRESS_DOWN   // DOWN
#define GPIO_PIN_04 GpioAction::BUTTON_PRESS_RIGHT  // RIGHT
`;
    expect(extractBoardWiring(contents)).toBeNull();
  });

  it('tolerates leading whitespace before #define, as some boards use', () => {
    const contents = [
      ' #define GPIO_PIN_02 GpioAction::BUTTON_PRESS_UP',
      '#define GPIO_PIN_03 GpioAction::BUTTON_PRESS_DOWN',
      '#define GPIO_PIN_04 GpioAction::BUTTON_PRESS_RIGHT',
      '#define GPIO_PIN_05 GpioAction::BUTTON_PRESS_LEFT',
    ].join('\n');
    expect(extractBoardWiring(contents)?.Up).toBe(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run scripts/genBoardWirings.test.js` (from `www/`)
Expected: FAIL — `genBoardWirings.js` doesn't exist yet / `extractBoardWiring` is not exported.

- [ ] **Step 3: Write the minimal implementation**

Create `www/scripts/genBoardWirings.js`:

```js
const KEY_MAP = {
  UP: 'Up', DOWN: 'Down', LEFT: 'Left', RIGHT: 'Right',
  B1: 'B1', B2: 'B2', B3: 'B3', B4: 'B4',
  L1: 'L1', L2: 'L2', R1: 'R1', R2: 'R2',
};

const WIRING_LINE_RE =
  /^\s*#define\s+GPIO_PIN_(\d+)\s+GpioAction::BUTTON_PRESS_(UP|DOWN|LEFT|RIGHT|B[1-4]|L[12]|R[12])\b/;

// Parses one board's BoardConfig.h contents into the fixed-12-slot wiring
// (which physical GPIO pin drives each of Up/Down/Left/Right/B1-4/L1/L2/R1/R2),
// or null if this board doesn't define all 4 D-pad directions (not a
// conventional gamepad layout — e.g. a template stub or an accessory board).
// Where a function is wired to more than one pin (a labeled secondary/
// accessibility input, seen on 10 real boards at design time), the first pin
// listed in the file wins — verified against every such case in configs/.
export function extractBoardWiring(contents) {
  const found = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(WIRING_LINE_RE);
    if (!match) continue;
    const key = KEY_MAP[match[2]];
    if (!(key in found)) {
      found[key] = Number(match[1]);
    }
  }
  const hasAllDirections = ['Up', 'Down', 'Left', 'Right'].every((k) => k in found);
  return hasAllDirections ? found : null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run scripts/genBoardWirings.test.js` (from `www/`)
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add www/scripts/genBoardWirings.js www/scripts/genBoardWirings.test.js
git commit -m "feat(dc): parse a board's fixed-12 GPIO wiring from BoardConfig.h"
```

---

## Task 2: `generateBoardWirings` — scan the whole `configs/` tree

**Files:**
- Modify: `www/scripts/genBoardWirings.js`
- Modify: `www/scripts/genBoardWirings.test.js`

**Interfaces:**
- Consumes: `extractBoardWiring` (Task 1).
- Produces: `generateBoardWirings(configsDir: string): Record<string, Record<string, number>>`
  — exported named function. Keys are the `configs/` folder name, **lowercased**.

- [ ] **Step 1: Write the failing tests**

Append to `www/scripts/genBoardWirings.test.js`:

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateBoardWirings } from './genBoardWirings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configsDir = path.resolve(__dirname, '../../configs');

describe('generateBoardWirings (against the real configs/ tree)', () => {
  it("reproduces MavercadeRev2's hardware-verified wiring", () => {
    const wirings = generateBoardWirings(configsDir);
    expect(wirings.mavercaderev2).toEqual({
      Up: 11, Down: 8, Right: 10, Left: 7,
      B1: 12, B2: 17, R2: 18, L2: 9,
      B3: 16, B4: 14, R1: 15, L1: 19,
    });
  });

  it('excludes boards with no real fixed-12 D-pad', () => {
    const wirings = generateBoardWirings(configsDir);
    // Blank: template stub, no real hardware.
    expect(wirings.blank).toBeUndefined();
    // GranolaBeacon: accessory board; its one BUTTON_PRESS_UP macro is an
    // unrelated HE-trigger alias, not a D-pad.
    expect(wirings.granolabeacon).toBeUndefined();
  });

  it('covers the boards already known to need non-Pico wiring', () => {
    const wirings = generateBoardWirings(configsDir);
    for (const board of ['pico', 'mistercadev2', 'opencore0', 'mavercaderev2']) {
      expect(wirings[board]).toBeDefined();
    }
  });

  it("picks Granola's primary cluster pins, not its labeled accessibility-input duplicates", () => {
    // configs/Granola/BoardConfig.h defines L1/R1 twice: GPIO_PIN_12/13 under
    // "Main pin mapping Configuration", and GPIO_PIN_00/01 again under a
    // later "Additional accessibility inputs" comment block. The first
    // (primary) pins must win.
    const wirings = generateBoardWirings(configsDir);
    expect(wirings.granola).toMatchObject({ R1: 12, L1: 13 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run scripts/genBoardWirings.test.js` (from `www/`)
Expected: FAIL — `generateBoardWirings` is not exported.

- [ ] **Step 3: Write the minimal implementation**

Add to `www/scripts/genBoardWirings.js` (below `extractBoardWiring`):

```js
import fs from 'node:fs';
import path from 'node:path';
```

(add these two imports at the top of the file, above `KEY_MAP`)

```js
// Scans every configs/<Board>/BoardConfig.h and returns
// { [lowercased board folder name]: wiring }, skipping any board
// extractBoardWiring rejects (see that function's doc comment).
export function generateBoardWirings(configsDir) {
  const wirings = {};
  for (const entry of fs.readdirSync(configsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const boardConfigPath = path.join(configsDir, entry.name, 'BoardConfig.h');
    if (!fs.existsSync(boardConfigPath)) continue;
    const wiring = extractBoardWiring(fs.readFileSync(boardConfigPath, 'utf8'));
    if (wiring) {
      wirings[entry.name.toLowerCase()] = wiring;
    }
  }
  return wirings;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run scripts/genBoardWirings.test.js` (from `www/`)
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add www/scripts/genBoardWirings.js www/scripts/genBoardWirings.test.js
git commit -m "feat(dc): scan the full configs/ tree for board wirings"
```

---

## Task 3: Render, wire into npm scripts, generate the committed output

**Files:**
- Modify: `www/scripts/genBoardWirings.js`
- Modify: `www/scripts/genBoardWirings.test.js`
- Modify: `www/package.json`
- Create: `www/src_gen/boardWirings.ts` (generated, then committed)

**Interfaces:**
- Consumes: `generateBoardWirings` (Task 2).
- Produces: `renderTsFile(wirings: Record<string, Record<string, number>>): string` — exported
  named function. `www/src_gen/boardWirings.ts` exporting
  `GENERATED_BOARD_WIRINGS: Record<string, Record<string, number>>` (consumed by Task 4).

- [ ] **Step 1: Write the failing test**

Append to `www/scripts/genBoardWirings.test.js`:

```js
import { renderTsFile } from './genBoardWirings.js';

describe('renderTsFile', () => {
  it('renders a sorted, typed TS map keyed by lowercased board name', () => {
    const ts = renderTsFile({
      zzz: { Up: 1, Down: 2, Left: 3, Right: 4 },
      pico: { Up: 2, Down: 3, Left: 5, Right: 4 },
    });
    expect(ts).toContain('GENERATED FILE');
    expect(ts).toContain(
      'export const GENERATED_BOARD_WIRINGS: Record<string, Record<string, number>> = {',
    );
    expect(ts.indexOf('"pico"')).toBeLessThan(ts.indexOf('"zzz"'));
    expect(ts).toContain('"pico": { Up: 2, Down: 3, Left: 5, Right: 4 },');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run scripts/genBoardWirings.test.js` (from `www/`)
Expected: FAIL — `renderTsFile` is not exported.

- [ ] **Step 3: Write the minimal implementation**

Add to `www/scripts/genBoardWirings.js` (below `generateBoardWirings`):

```js
import { fileURLToPath, pathToFileURL } from 'node:url';
```

(add to the top imports, alongside `fs`/`path`)

```js
const KEY_ORDER = [
  'Up', 'Down', 'Left', 'Right',
  'B1', 'B2', 'B3', 'B4', 'L1', 'L2', 'R1', 'R2',
];

// Renders the wirings map as a TypeScript source file.
export function renderTsFile(wirings) {
  const boardEntries = Object.keys(wirings)
    .sort()
    .map((board) => {
      const wiring = wirings[board];
      const fields = KEY_ORDER.filter((k) => k in wiring)
        .map((k) => `${k}: ${wiring[k]}`)
        .join(', ');
      return `  ${JSON.stringify(board)}: { ${fields} },`;
    })
    .join('\n');

  return `// GENERATED FILE — do not hand-edit.
// Produced by \`npm run gen-board-wirings\` (www/scripts/genBoardWirings.js)
// from ../configs/*/BoardConfig.h. Re-run that script — or \`npm start\`/
// \`npm run build\`, which already do — after configs/ changes.

export const GENERATED_BOARD_WIRINGS: Record<string, Record<string, number>> = {
${boardEntries}
};
`;
}

function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const configsDir = path.resolve(__dirname, '../../configs');
  const outPath = path.resolve(__dirname, '../src_gen/boardWirings.ts');

  const wirings = generateBoardWirings(configsDir);
  fs.writeFileSync(outPath, renderTsFile(wirings));
  console.log(
    `gen-board-wirings: wrote ${Object.keys(wirings).length} board wirings to ${outPath}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run scripts/genBoardWirings.test.js` (from `www/`)
Expected: PASS (9 tests)

- [ ] **Step 5: Wire the npm scripts**

In `www/package.json`, add a new script and prepend it to `build` and `start`:

```json
"build": "npm run build-proto && npm run gen-board-wirings && npx vite build && npm run makefsdata",
```

```json
"start": "npm run build-proto && npm run gen-board-wirings && vite",
```

Add, near `build-proto`:

```json
"gen-board-wirings": "node scripts/genBoardWirings.js",
```

- [ ] **Step 6: Generate the real output file**

Run (from `www/`): `node scripts/genBoardWirings.js`
Expected output: `gen-board-wirings: wrote 55 board wirings to .../www/src_gen/boardWirings.ts`

Verify: `git status --short www/src_gen/boardWirings.ts` shows it as a new (untracked) file, and
it contains a `"mavercaderev2": { Up: 11, Down: 8, ... }` entry.

- [ ] **Step 7: Commit**

```bash
git add www/scripts/genBoardWirings.js www/scripts/genBoardWirings.test.js www/package.json www/src_gen/boardWirings.ts
git commit -m "feat(dc): generate and wire in the board wiring table"
```

---

## Task 4: Integrate the generated table into `layouts.ts`

**Files:**
- Modify: `www/src/Data/dc/layouts.ts`
- Test: `www/src/Data/dc/layouts.test.ts` (no new tests — existing tests must keep passing
  unchanged, now exercising the generated table)

**Interfaces:**
- Consumes: `GENERATED_BOARD_WIRINGS` from `@proto/boardWirings` (Task 3's generated output;
  `@proto` is the existing Vite/Vitest alias for `www/src_gen`, already used for
  `@proto/enums`).
- Produces: no change to `getLayout`'s public signature — `BOARD_WIRINGS`'s *source* changes,
  its lookup behavior does not.

- [ ] **Step 1: Confirm the existing tests currently pass (baseline)**

Run: `npx vitest run src/Data/dc/layouts.test.ts` (from `www/`)
Expected: PASS (12 tests) — this is the pre-change baseline; Step 3 must not change this count
or these results, only where the data comes from.

- [ ] **Step 2: Replace the hand-written wiring constants**

In `www/src/Data/dc/layouts.ts`, add the import at the top of the file (it currently has none):

```ts
import { GENERATED_BOARD_WIRINGS } from '@proto/boardWirings';
```

Replace this block:

```ts
// configs/MiSTercadeV2/BoardConfig.h
const MISTERCADE_V2_WIRING: BoardWiring = {
  Up: 2, Down: 3, Right: 4, Left: 5,
  B2: 6, R2: 7, L1: 8, L2: 9,
  B3: 10, B4: 11, R1: 12, B1: 13,
};

// configs/OpenCore0/BoardConfig.h
const OPENCORE0_WIRING: BoardWiring = {
  Up: 12, Down: 10, Right: 11, Left: 9,
  B1: 13, B2: 14, R2: 15, L2: 16,
  B3: 17, B4: 18, R1: 19, L1: 20,
};

// configs/MavercadeRev2/BoardConfig.h
const MAVERCADE_REV2_WIRING: BoardWiring = {
  Up: 11, Down: 8, Right: 10, Left: 7,
  B1: 12, B2: 17, R2: 18, L2: 9,
  B3: 16, B4: 14, R1: 15, L1: 19,
};

const BOARD_WIRINGS: Record<string, BoardWiring> = {
  pico: PICO_WIRING,
  mistercadev2: MISTERCADE_V2_WIRING,
  opencore0: OPENCORE0_WIRING,
  mavercaderev2: MAVERCADE_REV2_WIRING,
};
```

with:

```ts
// Auto-generated from every configs/<Board>/BoardConfig.h by
// scripts/genBoardWirings.js — see that file and
// docs/superpowers/specs/2026-09-18-board-wiring-autogen-design.md. Do not
// hand-add board entries here; re-run `npm run gen-board-wirings` (or
// `npm start`/`npm run build`, which already do) after configs/ changes.
//
// Escape hatch for the rare case the generator's "first pin listed wins"
// heuristic picks the wrong one for some future board — add a correction
// here rather than special-casing the generator for one board.
const MANUAL_WIRING_OVERRIDES: Record<string, BoardWiring> = {};

const BOARD_WIRINGS: Record<string, BoardWiring> = {
  ...GENERATED_BOARD_WIRINGS,
  ...MANUAL_WIRING_OVERRIDES,
};
```

`PICO_WIRING` itself stays exactly as-is (it's also `getLayout`'s direct fallback, independent
of the table).

- [ ] **Step 3: Run the tests to verify they still pass**

Run: `npx vitest run src/Data/dc/layouts.test.ts` (from `www/`)
Expected: PASS (12 tests) — identical count/results to Step 1's baseline. In particular,
`'uses MavercadeRev2\'s own wiring instead of the Pico fallback'`,
`'uses a known board\'s own wiring instead of the default when it genuinely differs'`
(OpenCore0), and the MiSTercadeV2 cross-style test must all still pass, now sourced from
`GENERATED_BOARD_WIRINGS` instead of the deleted hand-written constants.

- [ ] **Step 4: Commit**

```bash
git add www/src/Data/dc/layouts.ts
git commit -m "refactor(dc): source board wiring from the generated table"
```

---

## Task 5: "Loading button map…" placeholder in `ControllerViewPage`

**Files:**
- Modify: `www/src/Pages/dc/ControllerViewPage.tsx`
- Modify: `www/src/Locales/en/DC.jsx`
- Modify: `www/src/Pages/dc/ControllerViewPage.test.tsx`

**Interfaces:**
- Consumes: `useConnectionStore((s) => s.status)` (already read in this component, currently
  only for an unrelated profiles-reload effect); `ControllerInfo` type from
  `../../Store/useConnectionStore`.
- Produces: no new exports; a new `data-testid="ctrl-loading-board"` render branch.

**Context:** Every existing test in `ControllerViewPage.test.tsx` renders with the *real*
`useConnectionStore` (not mocked) and never sets `controllerInfo`/`boardConfig` — so
`connectionStatus` is `'searching'` by default throughout the file today, while
`view.profiles` (mocked separately) is non-empty by default. Gating the whole page on
`connectionStatus === 'connected'` without also fixing the test file's default state would
break essentially every other test in the file. Step 1 below fixes that by giving the test
file an explicit "already connected, board known" default via `beforeEach`, matching what
those tests already implicitly assumed.

- [ ] **Step 1: Write the failing test, and fix the test file's default connection state**

In `www/src/Pages/dc/ControllerViewPage.test.tsx`, replace:

```ts
beforeEach(() => vi.clearAllMocks());
```

with:

```ts
beforeEach(() => {
  vi.clearAllMocks();
  // Most tests in this file implicitly assume an already-connected board
  // with a known identity (that's what let them render the full layout
  // before this state existed at all). Pico matches the B1=pin 6 assumption
  // already baked into the `view` fixture above (see Data/dc/layouts.ts).
  useConnectionStore.setState({
    status: 'connected',
    controllerName: 'Test Board',
    controllerInfo: {
      version: '',
      boardArchitecture: '',
      boardBuild: '',
      boardBuildType: '',
      boardConfigLabel: 'Pico',
      boardConfigFileName: '',
      boardConfig: 'Pico',
    },
  });
});
```

Then add a new test, right after the `'retries loading automatically...'` test:

```ts
it("shows a loading placeholder while the board's identity is still resolving, instead of silently using the Pico-default layout", () => {
  useConnectionStore.setState({
    status: 'searching',
    controllerName: '',
    controllerInfo: null,
  });
  render(
    <MemoryRouter initialEntries={['/']}>
      <ControllerViewPage />
    </MemoryRouter>,
  );
  expect(screen.getByTestId('ctrl-loading-board')).toBeInTheDocument();
  expect(screen.queryByTestId('ctrl-btn-B1')).not.toBeInTheDocument();

  act(() => {
    useConnectionStore.setState({
      status: 'connected',
      controllerInfo: {
        version: '',
        boardArchitecture: '',
        boardBuild: '',
        boardBuildType: '',
        boardConfigLabel: 'Pico',
        boardConfigFileName: '',
        boardConfig: 'Pico',
      },
    });
  });
  expect(screen.getByTestId('ctrl-btn-B1')).toBeInTheDocument();
  expect(screen.queryByTestId('ctrl-loading-board')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify the new one fails, and check for regressions**

Run: `npx vitest run src/Pages/dc/ControllerViewPage.test.tsx` (from `www/`)
Expected: the new test FAILS (no `ctrl-loading-board` element exists yet); all
previously-passing tests still PASS (the `beforeEach` change alone shouldn't break anything,
since it only makes already-assumed state explicit).

- [ ] **Step 3: Add the i18n string**

In `www/src/Locales/en/DC.jsx`, change:

```jsx
	'waiting-for-controller': 'Waiting for controller…',
```

to:

```jsx
	'waiting-for-controller': 'Waiting for controller…',
	'loading-button-map': 'Loading button map…',
```

- [ ] **Step 4: Add the loading branch**

In `www/src/Pages/dc/ControllerViewPage.tsx`, change:

```tsx
  if (view.profiles.length === 0) {
    return (
      <div data-testid="ctrl-waiting" className="tw-p-4">
        {t('waiting-for-controller')}
      </div>
    );
  }
```

to:

```tsx
  if (view.profiles.length === 0) {
    return (
      <div data-testid="ctrl-waiting" className="tw-p-4">
        {t('waiting-for-controller')}
      </div>
    );
  }

  // Profile data can load slightly ahead of the connection store resolving
  // the board's identity (two independent polling paths — see
  // Store/useConnectionStore.ts). Rendering in that gap would silently fall
  // back to PICO_WIRING for boards that aren't a Pico, exactly the bug class
  // this table's auto-generation (Data/dc/layouts.ts) fixes elsewhere.
  if (connectionStatus !== 'connected') {
    return (
      <div data-testid="ctrl-loading-board" className="tw-p-4">
        {t('loading-button-map')}
      </div>
    );
  }
```

- [ ] **Step 5: Run the tests to verify they all pass**

Run: `npx vitest run src/Pages/dc/ControllerViewPage.test.tsx` (from `www/`)
Expected: PASS, all tests (the new one plus every pre-existing one).

- [ ] **Step 6: Commit**

```bash
git add www/src/Pages/dc/ControllerViewPage.tsx www/src/Locales/en/DC.jsx www/src/Pages/dc/ControllerViewPage.test.tsx
git commit -m "feat(dc): show a loading placeholder until the board's identity resolves"
```

---

## Task 6: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run` (from `www/`)
Expected: PASS, all test files (should be 27 test files now — the 26 from before this work,
plus `scripts/genBoardWirings.test.js`).

- [ ] **Step 2: Run the scoped lint**

Run: `npm run lint:dc` (from `www/`)
Expected: no output, exit code 0.

- [ ] **Step 3: Run a full production build**

Run: `npm run build` (from `www/`)
Expected: completes successfully; `gen-board-wirings` runs as part of it (visible in the
output) and regenerates `src_gen/boardWirings.ts` (should produce no diff vs. what Task 3
committed, since `configs/` hasn't changed).

Verify no unexpected diff: `git status --short www/src_gen/boardWirings.ts` — expect no output
(clean).

- [ ] **Step 4: Run the bundle-size check**

Run: `npm run size-check` (from `www/`)
Expected: PASS — this change adds a small generated data table, not new UI code, so it should
stay well within budget.

- [ ] **Step 5: Report**

No commit for this task (verification only). Summarize: all tests/lint/build/size-check green,
and that all 55 boards with conventional wiring (up from 4) now have correct visualizer
layouts, confirmed via the `Blank`/`GranolaBeacon` exclusion tests and the `MavercadeRev2`
hardware-verified regression test.
