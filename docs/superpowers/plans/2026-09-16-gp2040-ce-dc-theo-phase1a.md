# GP2040-CE-D_C_Theo — Phase 1A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An interactive `/dc/controller` view that shows every button on a controller picture labeled with its logical name + GPIO pin, and lights up a button when the user presses it physically (press-to-identify).

**Architecture:** New `/dc/*` page composed of small units — GpioAction↔button-key data (reusing the proto-generated `BUTTON_ACTIONS`), per-style SVG layout placement data, a mapping loader hook, a `getHeldPins` long-poll hook, and pure SVG/selector components. Display + identify only; no device writes; no firmware changes.

**Tech Stack:** React 18 + TS, Zustand (existing), Tailwind (`tw-`) + Radix, inline SVG, Vitest + RTL. Reuses existing `WebApi` default export, `src/Data/Pins.ts` (`BUTTON_ACTIONS`), `src/Data/Buttons.js` label sets, and the `buttonLabels` AppContext.

**Spec:** `docs/superpowers/specs/2026-09-16-gp2040-ce-dc-theo-phase1a-design.md`

## Global Constraints

- Display + identify **only** — never call `setPinMappings` or any write endpoint.
- Reuse `BUTTON_ACTIONS` from `src/Data/Pins.ts` (proto-generated) — do not hand-author the GpioAction enum.
- All device calls go through the existing `WebApi` default export (`getPinMappings`, `getHeldPins`, `abortGetHeldPins`, `getBoardDefinition`).
- Tailwind utilities are `tw-` prefixed; SVG is inline vector (no bitmaps). CI bundle-size budget still applies.
- `localStorage` reads/writes wrapped in try/catch; UI must work if it throws/returns empty.
- New files live under `src/**/dc/` to keep the D_C_Theo layer separate from stock code.

---

### Task 1: GpioAction → layout button-key map

**Files:**
- Create: `www/src/Data/dc/gpioActions.ts`
- Test: `www/src/Data/dc/gpioActions.test.ts`

**Interfaces:**
- Consumes: `BUTTON_ACTIONS` from `src/Data/Pins.ts`.
- Produces:
  - `LayoutButtonKey` = `'Up'|'Down'|'Left'|'Right'|'B1'|'B2'|'B3'|'B4'|'L1'|'R1'|'L2'|'R2'|'S1'|'S2'|'A1'|'A2'|'L3'|'R3'`
  - `buttonKeyForAction(action: number): LayoutButtonKey | null` — returns the layout key for a GpioAction number, or null if the action isn't a rendered button (NONE/reserved/addon/unknown).

- [ ] **Step 1: Write the failing test**

```ts
// www/src/Data/dc/gpioActions.test.ts
import { describe, it, expect } from 'vitest';
import { buttonKeyForAction } from './gpioActions';
import { BUTTON_ACTIONS } from '../Pins';

describe('buttonKeyForAction', () => {
  it('maps known button actions to layout keys', () => {
    expect(buttonKeyForAction(BUTTON_ACTIONS.BUTTON_PRESS_B1)).toBe('B1');
    expect(buttonKeyForAction(BUTTON_ACTIONS.BUTTON_PRESS_UP)).toBe('Up');
    expect(buttonKeyForAction(BUTTON_ACTIONS.BUTTON_PRESS_R2)).toBe('R2');
  });
  it('returns null for non-rendered actions', () => {
    expect(buttonKeyForAction(BUTTON_ACTIONS.NONE)).toBeNull();
    expect(buttonKeyForAction(999999)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd www && npx vitest run gpioActions`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// www/src/Data/dc/gpioActions.ts
import { invert } from 'lodash';
import { BUTTON_ACTIONS } from '../Pins';

export type LayoutButtonKey =
  | 'Up' | 'Down' | 'Left' | 'Right'
  | 'B1' | 'B2' | 'B3' | 'B4'
  | 'L1' | 'R1' | 'L2' | 'R2'
  | 'S1' | 'S2' | 'A1' | 'A2' | 'L3' | 'R3';

// GpioAction enum key (e.g. 'BUTTON_PRESS_B1') -> layout key ('B1').
const ACTION_KEY_TO_LAYOUT: Record<string, LayoutButtonKey> = {
  BUTTON_PRESS_UP: 'Up', BUTTON_PRESS_DOWN: 'Down',
  BUTTON_PRESS_LEFT: 'Left', BUTTON_PRESS_RIGHT: 'Right',
  BUTTON_PRESS_B1: 'B1', BUTTON_PRESS_B2: 'B2',
  BUTTON_PRESS_B3: 'B3', BUTTON_PRESS_B4: 'B4',
  BUTTON_PRESS_L1: 'L1', BUTTON_PRESS_R1: 'R1',
  BUTTON_PRESS_L2: 'L2', BUTTON_PRESS_R2: 'R2',
  BUTTON_PRESS_S1: 'S1', BUTTON_PRESS_S2: 'S2',
  BUTTON_PRESS_A1: 'A1', BUTTON_PRESS_A2: 'A2',
  BUTTON_PRESS_L3: 'L3', BUTTON_PRESS_R3: 'R3',
};

const NUMBER_TO_ACTION_KEY = invert(BUTTON_ACTIONS) as Record<string, string>;

export function buttonKeyForAction(action: number): LayoutButtonKey | null {
  const actionKey = NUMBER_TO_ACTION_KEY[String(action)];
  if (!actionKey) return null;
  return ACTION_KEY_TO_LAYOUT[actionKey] ?? null;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd www && npx vitest run gpioActions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add www/src/Data/dc/gpioActions.ts www/src/Data/dc/gpioActions.test.ts
git commit -m "feat(1a): GpioAction -> layout button-key map (reuses proto BUTTON_ACTIONS)"
```

---

### Task 2: Controller layout placement data

**Files:**
- Create: `www/src/Data/dc/layouts.ts`
- Test: `www/src/Data/dc/layouts.test.ts`

**Interfaces:**
- Consumes: `LayoutButtonKey` (Task 1).
- Produces:
  - `LayoutStyle = 'leverless' | 'arcadeStick'`
  - `ButtonPlacement = { key: LayoutButtonKey; x: number; y: number; r: number }`
  - `Layout = { viewBox: string; placements: ButtonPlacement[] }`
  - `LAYOUTS: Record<LayoutStyle, Layout>`
  - `LAYOUT_STYLES: LayoutStyle[]`

- [ ] **Step 1: Write the failing test**

```ts
// www/src/Data/dc/layouts.test.ts
import { describe, it, expect } from 'vitest';
import { LAYOUTS, LAYOUT_STYLES } from './layouts';

describe('LAYOUTS', () => {
  it('defines both styles with a viewBox and placements', () => {
    expect(LAYOUT_STYLES).toEqual(['leverless', 'arcadeStick']);
    for (const style of LAYOUT_STYLES) {
      const layout = LAYOUTS[style];
      expect(layout.viewBox).toMatch(/^\d+ \d+ \d+ \d+$/);
      expect(layout.placements.length).toBeGreaterThan(0);
    }
  });
  it('has finite coordinates and unique keys per layout', () => {
    for (const style of LAYOUT_STYLES) {
      const keys = new Set<string>();
      for (const p of LAYOUTS[style].placements) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y) && p.r > 0).toBe(true);
        expect(keys.has(p.key)).toBe(false);
        keys.add(p.key);
      }
    }
  });
  it('includes the 4 directions and B1-B4 in both layouts', () => {
    for (const style of LAYOUT_STYLES) {
      const keys = LAYOUTS[style].placements.map((p) => p.key);
      for (const k of ['Up', 'Down', 'Left', 'Right', 'B1', 'B2', 'B3', 'B4']) {
        expect(keys).toContain(k);
      }
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd www && npx vitest run layouts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// www/src/Data/dc/layouts.ts
import type { LayoutButtonKey } from './gpioActions';

export type LayoutStyle = 'leverless' | 'arcadeStick';
export type ButtonPlacement = { key: LayoutButtonKey; x: number; y: number; r: number };
export type Layout = { viewBox: string; placements: ButtonPlacement[] };

const R = 18; // action button radius
const RD = 15; // direction radius

// Right-hand 8-button cluster + aux, shared by both layouts.
const rightCluster: ButtonPlacement[] = [
  { key: 'B3', x: 250, y: 110, r: R },
  { key: 'B4', x: 300, y: 100, r: R },
  { key: 'R1', x: 350, y: 105, r: R },
  { key: 'L1', x: 400, y: 120, r: R },
  { key: 'B1', x: 255, y: 160, r: R },
  { key: 'B2', x: 305, y: 150, r: R },
  { key: 'R2', x: 355, y: 155, r: R },
  { key: 'L2', x: 405, y: 170, r: R },
  { key: 'S1', x: 190, y: 55, r: 12 },
  { key: 'S2', x: 225, y: 55, r: 12 },
  { key: 'A1', x: 260, y: 55, r: 12 },
  { key: 'A2', x: 295, y: 55, r: 12 },
];

const leverlessDirections: ButtonPlacement[] = [
  { key: 'Left', x: 45, y: 150, r: RD },
  { key: 'Down', x: 88, y: 165, r: RD },
  { key: 'Right', x: 131, y: 150, r: RD },
  { key: 'Up', x: 115, y: 210, r: 22 }, // large thumb button
];

const arcadeDirections: ButtonPlacement[] = [
  { key: 'Up', x: 85, y: 105, r: RD },
  { key: 'Down', x: 85, y: 185, r: RD },
  { key: 'Left', x: 45, y: 145, r: RD },
  { key: 'Right', x: 125, y: 145, r: RD },
];

export const LAYOUTS: Record<LayoutStyle, Layout> = {
  leverless: {
    viewBox: '0 0 460 250',
    placements: [...leverlessDirections, ...rightCluster],
  },
  arcadeStick: {
    viewBox: '0 0 460 250',
    placements: [...arcadeDirections, ...rightCluster],
  },
};

export const LAYOUT_STYLES: LayoutStyle[] = ['leverless', 'arcadeStick'];
```

- [ ] **Step 4: Run to verify pass**

Run: `cd www && npx vitest run layouts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add www/src/Data/dc/layouts.ts www/src/Data/dc/layouts.test.ts
git commit -m "feat(1a): leverless + arcade-stick SVG layout placement data"
```

---

### Task 3: Controller mapping loader

**Files:**
- Create: `www/src/Hooks/dc/useControllerMapping.ts`
- Test: `www/src/Hooks/dc/useControllerMapping.test.ts`

**Interfaces:**
- Consumes: `WebApi.getPinMappings`, `buttonKeyForAction` (Task 1).
- Produces:
  - `MappedButton = { pin: number; action: number; buttonKey: LayoutButtonKey }`
  - `loadControllerMapping(api?): Promise<MappedButton[]>` — reads `getPinMappings`, iterates keys matching `/^pin(\d+)$/`, maps `action` via `buttonKeyForAction`, keeps only entries with a non-null button key. `api` defaults to `{ getPinMappings: WebApi.getPinMappings }`.

- [ ] **Step 1: Write the failing test**

```ts
// www/src/Hooks/dc/useControllerMapping.test.ts
import { describe, it, expect, vi } from 'vitest';
import { loadControllerMapping } from './useControllerMapping';
import { BUTTON_ACTIONS } from '../../Data/Pins';

describe('loadControllerMapping', () => {
  it('normalizes pinNN entries into MappedButton[] and drops unmapped/none', async () => {
    const api = {
      getPinMappings: vi.fn().mockResolvedValue({
        profileLabel: 'Profile 1',
        enabled: true,
        pin00: { action: BUTTON_ACTIONS.BUTTON_PRESS_B1 },
        pin07: { action: BUTTON_ACTIONS.BUTTON_PRESS_UP },
        pin09: { action: BUTTON_ACTIONS.NONE },
      }),
    };
    const result = await loadControllerMapping(api);
    expect(result).toEqual(
      expect.arrayContaining([
        { pin: 0, action: BUTTON_ACTIONS.BUTTON_PRESS_B1, buttonKey: 'B1' },
        { pin: 7, action: BUTTON_ACTIONS.BUTTON_PRESS_UP, buttonKey: 'Up' },
      ]),
    );
    expect(result).toHaveLength(2); // NONE dropped
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd www && npx vitest run useControllerMapping`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// www/src/Hooks/dc/useControllerMapping.ts
// @ts-expect-error - WebApi.js is untyped JS
import WebApi from '../../Services/WebApi';
import { buttonKeyForAction, type LayoutButtonKey } from '../../Data/dc/gpioActions';

export type MappedButton = { pin: number; action: number; buttonKey: LayoutButtonKey };

type MappingApi = {
  getPinMappings: () => Promise<Record<string, { action: number } | unknown>>;
};

const defaultApi: MappingApi = { getPinMappings: WebApi.getPinMappings };

export async function loadControllerMapping(
  api: MappingApi = defaultApi,
): Promise<MappedButton[]> {
  const data = await api.getPinMappings();
  const result: MappedButton[] = [];
  for (const [key, value] of Object.entries(data ?? {})) {
    const match = /^pin(\d+)$/.exec(key);
    if (!match) continue;
    const action = (value as { action?: number })?.action;
    if (typeof action !== 'number') continue;
    const buttonKey = buttonKeyForAction(action);
    if (!buttonKey) continue;
    result.push({ pin: Number(match[1]), action, buttonKey });
  }
  return result;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd www && npx vitest run useControllerMapping`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add www/src/Hooks/dc/useControllerMapping.ts www/src/Hooks/dc/useControllerMapping.test.ts
git commit -m "feat(1a): controller mapping loader (pinNN + action -> MappedButton)"
```

---

### Task 4: Held-pins long-poll hook

**Files:**
- Create: `www/src/Hooks/dc/useHeldPinsMonitor.ts`
- Test: `www/src/Hooks/dc/useHeldPinsMonitor.test.ts`

**Interfaces:**
- Consumes: `WebApi.getHeldPins`, `WebApi.abortGetHeldPins`.
- Produces: `useHeldPinsMonitor(enabled?: boolean, api?): number[]` — while enabled, loops
  `getHeldPins(signal)`; on `{ heldPins }` updates state and re-polls; on unmount aborts and
  calls `abortGetHeldPins`. Ignores `{ canceled: true }`. `api` defaults to WebApi funcs.

- [ ] **Step 1: Write the failing test**

```ts
// www/src/Hooks/dc/useHeldPinsMonitor.test.ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd www && npx vitest run useHeldPinsMonitor`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// www/src/Hooks/dc/useHeldPinsMonitor.ts
import { useEffect, useState } from 'react';
// @ts-expect-error - WebApi.js is untyped JS
import WebApi from '../../Services/WebApi';

type HeldPinsApi = {
  getHeldPins: (signal?: AbortSignal) => Promise<{ heldPins?: number[]; canceled?: boolean } | undefined>;
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
```

- [ ] **Step 4: Run to verify pass**

Run: `cd www && npx vitest run useHeldPinsMonitor`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add www/src/Hooks/dc/useHeldPinsMonitor.ts www/src/Hooks/dc/useHeldPinsMonitor.test.ts
git commit -m "feat(1a): getHeldPins long-poll hook for press-to-identify"
```

---

### Task 5: ControllerLayout SVG component

**Files:**
- Create: `www/src/Components/dc/ControllerLayout.tsx`
- Test: `www/src/Components/dc/ControllerLayout.test.tsx`

**Interfaces:**
- Consumes: `LAYOUTS`, `LayoutStyle` (Task 2); `MappedButton` (Task 3).
- Produces: `<ControllerLayout layoutStyle mapping heldPins labelFor />`
  - `labelFor: (buttonKey: LayoutButtonKey) => string`
  - For each placement, if a `MappedButton` exists for that `buttonKey`, render the button
    with the label and its pin (`P<pin>`); if that pin ∈ `heldPins`, mark held.
  - Each button group has `data-testid="ctrl-btn-<buttonKey>"` and
    `data-held="true|false"`. Buttons with no mapping render dimmed with no pin text.

- [ ] **Step 1: Write the failing test**

```tsx
// www/src/Components/dc/ControllerLayout.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ControllerLayout from './ControllerLayout';

const labelFor = (k: string) => (k === 'B1' ? 'Cross' : k);

describe('ControllerLayout', () => {
  const mapping = [
    { pin: 0, action: 5, buttonKey: 'B1' as const },
    { pin: 7, action: 1, buttonKey: 'Up' as const },
  ];

  it('renders labels and pins for mapped buttons', () => {
    render(
      <ControllerLayout layoutStyle="leverless" mapping={mapping} heldPins={[]} labelFor={labelFor} />,
    );
    const b1 = screen.getByTestId('ctrl-btn-B1');
    expect(b1).toHaveTextContent('Cross');
    expect(b1).toHaveTextContent('P0');
    expect(b1).toHaveAttribute('data-held', 'false');
  });

  it('marks a button held when its pin is in heldPins', () => {
    render(
      <ControllerLayout layoutStyle="leverless" mapping={mapping} heldPins={[7]} labelFor={labelFor} />,
    );
    expect(screen.getByTestId('ctrl-btn-Up')).toHaveAttribute('data-held', 'true');
    expect(screen.getByTestId('ctrl-btn-B1')).toHaveAttribute('data-held', 'false');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd www && npx vitest run ControllerLayout`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement**

```tsx
// www/src/Components/dc/ControllerLayout.tsx
import { LAYOUTS, type LayoutStyle } from '../../Data/dc/layouts';
import type { LayoutButtonKey } from '../../Data/dc/gpioActions';
import type { MappedButton } from '../../Hooks/dc/useControllerMapping';

type Props = {
  layoutStyle: LayoutStyle;
  mapping: MappedButton[];
  heldPins: number[];
  labelFor: (buttonKey: LayoutButtonKey) => string;
};

export default function ControllerLayout({ layoutStyle, mapping, heldPins, labelFor }: Props) {
  const layout = LAYOUTS[layoutStyle];
  const byKey = new Map(mapping.map((m) => [m.buttonKey, m]));

  return (
    <svg viewBox={layout.viewBox} className="tw-w-full tw-max-w-2xl" role="img" aria-label="Controller layout">
      {layout.placements.map((p) => {
        const mapped = byKey.get(p.key);
        const held = mapped ? heldPins.includes(mapped.pin) : false;
        const fill = mapped ? (held ? '#38bdf8' : '#1e293b') : '#0f172a';
        const stroke = mapped ? (held ? '#7dd3fc' : '#475569') : '#334155';
        return (
          <g key={p.key} data-testid={`ctrl-btn-${p.key}`} data-held={held ? 'true' : 'false'}>
            <circle cx={p.x} cy={p.y} r={p.r} fill={fill} stroke={stroke} strokeWidth={2} />
            <text x={p.x} y={p.y - 2} textAnchor="middle" fontSize="9" fill="#e2e8f0">
              {labelFor(p.key)}
            </text>
            {mapped && (
              <text x={p.x} y={p.y + 9} textAnchor="middle" fontSize="8" fill="#94a3b8">
                {`P${mapped.pin}`}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd www && npx vitest run ControllerLayout`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add www/src/Components/dc/ControllerLayout.tsx www/src/Components/dc/ControllerLayout.test.tsx
git commit -m "feat(1a): ControllerLayout SVG (labels + pins, held highlight)"
```

---

### Task 6: Layout style selector (with persistence)

**Files:**
- Create: `www/src/Components/dc/LayoutStyleSelector.tsx`
- Test: `www/src/Components/dc/LayoutStyleSelector.test.tsx`

**Interfaces:**
- Consumes: `LAYOUT_STYLES`, `LayoutStyle` (Task 2).
- Produces: `<LayoutStyleSelector value onChange />` — a segmented control (buttons) for
  each style; clicking calls `onChange(style)`. Also exports helpers
  `readSavedLayoutStyle(): LayoutStyle | null` and `saveLayoutStyle(style)` (localStorage,
  key `dc.layoutStyle`, try/catch wrapped).

- [ ] **Step 1: Write the failing test**

```tsx
// www/src/Components/dc/LayoutStyleSelector.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LayoutStyleSelector from './LayoutStyleSelector';

describe('LayoutStyleSelector', () => {
  it('renders a control per style and reports selection', async () => {
    const onChange = vi.fn();
    render(<LayoutStyleSelector value="leverless" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /arcade/i }));
    expect(onChange).toHaveBeenCalledWith('arcadeStick');
  });

  it('marks the active style with aria-pressed', () => {
    const onChange = vi.fn();
    render(<LayoutStyleSelector value="leverless" onChange={onChange} />);
    expect(screen.getByRole('button', { name: /leverless/i })).toHaveAttribute('aria-pressed', 'true');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd www && npx vitest run LayoutStyleSelector`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement**

```tsx
// www/src/Components/dc/LayoutStyleSelector.tsx
import { LAYOUT_STYLES, type LayoutStyle } from '../../Data/dc/layouts';

const LABELS: Record<LayoutStyle, string> = {
  leverless: 'Leverless',
  arcadeStick: 'Arcade Stick',
};

const STORAGE_KEY = 'dc.layoutStyle';

export function readSavedLayoutStyle(): LayoutStyle | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'leverless' || v === 'arcadeStick' ? v : null;
  } catch {
    return null;
  }
}

export function saveLayoutStyle(style: LayoutStyle): void {
  try {
    localStorage.setItem(STORAGE_KEY, style);
  } catch {
    // per-viewer convenience only; ignore failures
  }
}

type Props = { value: LayoutStyle; onChange: (style: LayoutStyle) => void };

export default function LayoutStyleSelector({ value, onChange }: Props) {
  return (
    <div className="tw-inline-flex tw-rounded tw-border tw-border-slate-600 tw-overflow-hidden">
      {LAYOUT_STYLES.map((style) => (
        <button
          key={style}
          type="button"
          aria-pressed={value === style}
          onClick={() => onChange(style)}
          className={`tw-px-3 tw-py-1 tw-text-sm ${
            value === style ? 'tw-bg-sky-600 tw-text-white' : 'tw-bg-transparent tw-text-slate-300'
          }`}
        >
          {LABELS[style]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd www && npx vitest run LayoutStyleSelector`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add www/src/Components/dc/LayoutStyleSelector.tsx www/src/Components/dc/LayoutStyleSelector.test.tsx
git commit -m "feat(1a): layout style selector with localStorage persistence"
```

---

### Task 7: ControllerViewPage + app wiring

**Files:**
- Create: `www/src/Pages/dc/ControllerViewPage.tsx`
- Test: `www/src/Pages/dc/ControllerViewPage.test.tsx`
- Modify: `www/src/App.tsx` (add `/dc/controller` route)
- Modify: `www/src/Components/Navigation.jsx` (toggle target `/dc/settings` → `/dc/controller`)

**Interfaces:**
- Consumes: `loadControllerMapping` (Task 3), `useHeldPinsMonitor` (Task 4),
  `ControllerLayout` (Task 5), `LayoutStyleSelector` + `readSavedLayoutStyle`/`saveLayoutStyle`
  (Task 6), and the `buttonLabels` AppContext + `BUTTONS` label sets for `labelFor`.
- Produces: `<ControllerViewPage />` — on mount loads the mapping; builds `labelFor` from the
  selected label set (fallback to the raw key); default layout style =
  `readSavedLayoutStyle()` or `'leverless'`; runs `useHeldPinsMonitor`; renders selector +
  `ControllerLayout`. Shows `data-testid="ctrl-waiting"` until the mapping resolves.

- [ ] **Step 1: Write the failing test**

```tsx
// www/src/Pages/dc/ControllerViewPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../../Hooks/dc/useControllerMapping', () => ({
  loadControllerMapping: vi
    .fn()
    .mockResolvedValue([{ pin: 0, action: 5, buttonKey: 'B1' }]),
}));
vi.mock('../../Hooks/dc/useHeldPinsMonitor', () => ({
  useHeldPinsMonitor: vi.fn().mockReturnValue([]),
}));

import { loadControllerMapping } from '../../Hooks/dc/useControllerMapping';
import ControllerViewPage from './ControllerViewPage';

beforeEach(() => vi.clearAllMocks());

describe('ControllerViewPage', () => {
  it('loads the mapping and renders the controller layout', async () => {
    render(<ControllerViewPage />);
    await waitFor(() => expect(loadControllerMapping).toHaveBeenCalled());
    expect(await screen.findByTestId('ctrl-btn-B1')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd www && npx vitest run ControllerViewPage`
Expected: FAIL — page not found.

- [ ] **Step 3: Implement the page**

```tsx
// www/src/Pages/dc/ControllerViewPage.tsx
import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../Contexts/AppContext';
import { BUTTONS } from '../../Data/Buttons';
import { loadControllerMapping, type MappedButton } from '../../Hooks/dc/useControllerMapping';
import { useHeldPinsMonitor } from '../../Hooks/dc/useHeldPinsMonitor';
import ControllerLayout from '../../Components/dc/ControllerLayout';
import LayoutStyleSelector, {
  readSavedLayoutStyle,
  saveLayoutStyle,
} from '../../Components/dc/LayoutStyleSelector';
import type { LayoutStyle } from '../../Data/dc/layouts';
import type { LayoutButtonKey } from '../../Data/dc/gpioActions';

export default function ControllerViewPage() {
  const [mapping, setMapping] = useState<MappedButton[] | null>(null);
  const [style, setStyle] = useState<LayoutStyle>(readSavedLayoutStyle() ?? 'leverless');
  const heldPins = useHeldPinsMonitor(true);

  const appContext = useContext(AppContext) as { buttonLabels?: { buttonLabelType?: string } };
  const labelSetKey = appContext?.buttonLabels?.buttonLabelType ?? 'gp2040';
  const labelSet = (BUTTONS as Record<string, Record<string, string>>)[labelSetKey] ?? BUTTONS.gp2040;
  const labelFor = (key: LayoutButtonKey): string => labelSet[key] ?? key;

  useEffect(() => {
    loadControllerMapping()
      .then(setMapping)
      .catch(() => setMapping([]));
  }, []);

  const onStyleChange = (s: LayoutStyle) => {
    setStyle(s);
    saveLayoutStyle(s);
  };

  if (mapping === null) {
    return <div data-testid="ctrl-waiting" className="tw-p-4">Waiting for controller…</div>;
  }

  return (
    <div className="tw-p-4 tw-space-y-4">
      <div className="tw-flex tw-items-center tw-justify-between">
        <h1 className="tw-text-lg tw-font-semibold">Controller</h1>
        <LayoutStyleSelector value={style} onChange={onStyleChange} />
      </div>
      <p className="tw-text-sm tw-text-slate-400">
        Each button shows its label and GPIO pin. Press a button on your controller to light it up here.
      </p>
      <ControllerLayout layoutStyle={style} mapping={mapping} heldPins={heldPins} labelFor={labelFor} />
    </div>
  );
}
```

- [ ] **Step 4: Wire route + toggle target**

In `www/src/App.tsx`, import `ControllerViewPage` and add inside `<Routes>`:

```tsx
<Route path="/dc/controller" element={<ControllerViewPage />} />
```

In `www/src/Components/Navigation.jsx`, change the toggle target:

```jsx
const toggleInterface = () =>
    navigate(inModifiedInterface ? '/' : '/dc/controller');
```

- [ ] **Step 5: Run tests to verify pass**

Run: `cd www && npx vitest run ControllerViewPage`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add www/src/Pages/dc/ControllerViewPage.tsx www/src/Pages/dc/ControllerViewPage.test.tsx www/src/App.tsx www/src/Components/Navigation.jsx
git commit -m "feat(1a): controller view page; route /dc/controller; toggle lands here"
```

---

### Task 8: Full verification

**Files:**
- Modify: `docs/phase-0-smoke-test.md` → add a Phase 1A section, OR create
  `docs/phase-1a-smoke-test.md` (create it).

**Interfaces:**
- Consumes: everything above.
- Produces: a green automated gate and a documented manual check.

- [ ] **Step 1: Run the automated gate**

Run: `cd www && npm test && npm run build && npm run size-check`
Expected: all pass; bundle within budget.

- [ ] **Step 2: Dev-server check (no hardware)**

Run `cd www && npm run dev`, open `http://localhost:3000/dc/controller`. Expected: the
controller SVG renders with labels + pins from the mock `getPinMappings`; the layout style
selector switches between leverless and arcade; against the mock, `getHeldPins` returns
`[7]` so the button mapped to GPIO 7 periodically lights up.

- [ ] **Step 3: Write the smoke-test doc**

Create `docs/phase-1a-smoke-test.md` — manual checklist:
1. Open `/dc/controller`; confirm each mapped button shows label + `P<pin>`.
2. Switch layout style; confirm it persists on reload.
3. On hardware: press a physical button; confirm the correct on-screen button lights up.

- [ ] **Step 4: Commit**

```bash
git add docs/phase-1a-smoke-test.md
git commit -m "docs(1a): Phase 1A smoke-test checklist"
```

- [ ] **Step 5: Push**

```bash
git push -u origin phase-1a-controller-view
```

---

## Self-Review

**Spec coverage:**
- Two SVG layouts (leverless + arcade) → Task 2. ✓
- Auto-populate labels + pins from device → Tasks 3, 5, 7. ✓
- Press-to-identify via getHeldPins long-poll → Tasks 4, 5, 7. ✓
- Layout selection remembered → Task 6. ✓
- Reuse BUTTON_ACTIONS / Buttons label sets → Tasks 1, 7. ✓
- Display + identify only (no writes) → no task calls setPinMappings. ✓
- Route + toggle wiring → Task 7. ✓
- Error/waiting state → Task 7 (`ctrl-waiting`), Task 4 (abort/retry). ✓
- Tests for each unit → every task has tests. ✓

**Placeholder scan:** No TBD/TODO; layout coordinates are concrete; all code blocks complete.

**Type consistency:** `LayoutButtonKey` (Task 1) used by Tasks 2/5/7; `MappedButton` (Task 3)
used by Tasks 5/7; `LayoutStyle`/`LAYOUTS`/`LAYOUT_STYLES` (Task 2) used by Tasks 5/6/7;
`useHeldPinsMonitor` signature (Task 4) matches Task 7 usage; `ControllerLayout` prop names
and `data-testid`/`data-held` contract match its test and the page.

**Board auto-select note:** Spec §9 marks board→style auto-selection as best-effort;
Task 6/7 implement the remembered/user-picked fallback (the shipped behavior). A recognized
-board default table is intentionally deferred and not a task here.

**Hardware note:** Task 8 Step 3's on-hardware press check is human-run and cannot be
executed in this environment.
