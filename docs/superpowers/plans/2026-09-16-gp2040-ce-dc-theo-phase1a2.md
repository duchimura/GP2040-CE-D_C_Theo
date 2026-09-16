# GP2040-CE-D_C_Theo — Phase 1A.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Remap" mode to `/dc/controller` where the user picks a function from a list and clicks buttons to assign it, then saves the new pin→function mapping to the device.

**Architecture:** Reuse 1A's controller view + `getPinMappings`/`setPinMappings`. Add a pure remap-state reducer, an `applyMappingChanges`/`saveRemap` write path, a `FunctionList`, a `RemapBar`, and optional edit props on `ControllerLayout`. Remap renders the load-time snapshot (1:1, stable positions) and only overrides labels/pending, so buttons don't reflow mid-edit.

**Tech Stack:** React 18 + TS, Zustand (existing), Tailwind (`tw-`) + Radix, Vitest + RTL. Reuses WebApi default export, `Data/Pins` `BUTTON_ACTIONS`, `Data/dc/gpioActions`, `Data/Buttons` label sets, `DC` i18n namespace.

**Spec:** `docs/superpowers/specs/2026-09-16-gp2040-ce-dc-theo-phase1a2-design.md`

## Global Constraints

- Only writes via `setPinMappings`; re-read `getPinMappings` immediately before writing and merge onto that.
- Overwrite the clicked button's function only; duplicates allowed; only wired buttons clickable.
- All new UI strings go through the `DC` i18n namespace; code must pass `npm run lint:dc` (`--max-warnings 0`).
- New files under `src/**/dc/`. Tailwind `tw-` prefix. No firmware changes. Keep the CI bundle-size budget.
- Reuse `buttonKeyForAction`/`BUTTON_ACTIONS`; do not hand-author enum values.

---

### Task 1: gpioActions — inverse map + assignable function list

**Files:**
- Modify: `www/src/Data/dc/gpioActions.ts`
- Test: `www/src/Data/dc/gpioActions.test.ts` (extend)

**Interfaces:**
- Produces:
  - `actionForButtonKey(key: LayoutButtonKey): number` — GpioAction number for a layout key.
  - `ASSIGNABLE_FUNCTIONS: LayoutButtonKey[]` — ordered list for the function list.

- [ ] **Step 1: Add failing tests**

Append to `gpioActions.test.ts`:

```ts
import { actionForButtonKey, ASSIGNABLE_FUNCTIONS } from './gpioActions';

describe('actionForButtonKey', () => {
  it('is the inverse of buttonKeyForAction for all assignable functions', () => {
    for (const key of ASSIGNABLE_FUNCTIONS) {
      expect(buttonKeyForAction(actionForButtonKey(key))).toBe(key);
    }
  });
  it('lists the directions and B1-B4', () => {
    for (const k of ['Up', 'Down', 'Left', 'Right', 'B1', 'B2', 'B3', 'B4']) {
      expect(ASSIGNABLE_FUNCTIONS).toContain(k);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd www && npx vitest run gpioActions`
Expected: FAIL — `actionForButtonKey`/`ASSIGNABLE_FUNCTIONS` not exported.

- [ ] **Step 3: Implement**

Append to `gpioActions.ts`:

```ts
const LAYOUT_TO_ACTION_KEY: Record<LayoutButtonKey, string> = Object.fromEntries(
  Object.entries(ACTION_KEY_TO_LAYOUT).map(([actionKey, layoutKey]) => [
    layoutKey,
    actionKey,
  ]),
) as Record<LayoutButtonKey, string>;

export function actionForButtonKey(key: LayoutButtonKey): number {
  return BUTTON_ACTIONS[LAYOUT_TO_ACTION_KEY[key] as keyof typeof BUTTON_ACTIONS];
}

export const ASSIGNABLE_FUNCTIONS: LayoutButtonKey[] = [
  'Up', 'Down', 'Left', 'Right',
  'B1', 'B2', 'B3', 'B4',
  'L1', 'R1', 'L2', 'R2',
  'S1', 'S2', 'A1', 'A2', 'L3', 'R3',
];
```

- [ ] **Step 4: Run to verify pass**

Run: `cd www && npx vitest run gpioActions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add www/src/Data/dc/gpioActions.ts www/src/Data/dc/gpioActions.test.ts
git commit -m "feat(1a2): actionForButtonKey inverse + ASSIGNABLE_FUNCTIONS list"
```

---

### Task 2: Remap state reducer

**Files:**
- Create: `www/src/Hooks/dc/useRemapState.ts`
- Test: `www/src/Hooks/dc/useRemapState.test.ts`

**Interfaces:**
- Consumes: `MappedButton` (1A).
- Produces:
  - `RemapState = { originalActions: Record<number, number>; workingActions: Record<number, number>; dirty: boolean }` (keyed by pin).
  - `initRemapState(mapping: MappedButton[]): RemapState`
  - `assignFunction(state: RemapState, pin: number, action: number): RemapState`
  - `pendingPins(state: RemapState): number[]`

- [ ] **Step 1: Write failing tests**

```ts
// www/src/Hooks/dc/useRemapState.test.ts
import { describe, it, expect } from 'vitest';
import { initRemapState, assignFunction, pendingPins } from './useRemapState';

const mapping = [
  { pin: 6, action: 5, buttonKey: 'B1' as const },
  { pin: 7, action: 6, buttonKey: 'B2' as const },
];

describe('useRemapState', () => {
  it('seeds working actions from the snapshot and is not dirty', () => {
    const s = initRemapState(mapping);
    expect(s.workingActions).toEqual({ 6: 5, 7: 6 });
    expect(s.dirty).toBe(false);
  });
  it('assignFunction overwrites one pin and sets dirty', () => {
    let s = initRemapState(mapping);
    s = assignFunction(s, 6, 6); // pin 6 -> action 6 (B2)
    expect(s.workingActions[6]).toBe(6);
    expect(s.workingActions[7]).toBe(6); // untouched, duplicate allowed
    expect(s.dirty).toBe(true);
    expect(pendingPins(s)).toEqual([6]);
  });
  it('reverting a pin to its original action clears dirty', () => {
    let s = initRemapState(mapping);
    s = assignFunction(s, 6, 6);
    s = assignFunction(s, 6, 5); // back to original
    expect(s.dirty).toBe(false);
    expect(pendingPins(s)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd www && npx vitest run useRemapState`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// www/src/Hooks/dc/useRemapState.ts
import type { MappedButton } from './useControllerMapping';

export type RemapState = {
  originalActions: Record<number, number>;
  workingActions: Record<number, number>;
  dirty: boolean;
};

export function initRemapState(mapping: MappedButton[]): RemapState {
  const actions: Record<number, number> = {};
  for (const m of mapping) actions[m.pin] = m.action;
  return {
    originalActions: { ...actions },
    workingActions: { ...actions },
    dirty: false,
  };
}

function computeDirty(s: RemapState): boolean {
  return Object.keys(s.workingActions).some(
    (pin) => s.workingActions[Number(pin)] !== s.originalActions[Number(pin)],
  );
}

export function assignFunction(
  state: RemapState,
  pin: number,
  action: number,
): RemapState {
  const next: RemapState = {
    ...state,
    workingActions: { ...state.workingActions, [pin]: action },
    dirty: false,
  };
  next.dirty = computeDirty(next);
  return next;
}

export function pendingPins(state: RemapState): number[] {
  return Object.keys(state.workingActions)
    .map(Number)
    .filter((pin) => state.workingActions[pin] !== state.originalActions[pin]);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd www && npx vitest run useRemapState`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add www/src/Hooks/dc/useRemapState.ts www/src/Hooks/dc/useRemapState.test.ts
git commit -m "feat(1a2): remap-state reducer (assign/overwrite/dirty)"
```

---

### Task 3: Apply changes + save path

**Files:**
- Create: `www/src/Hooks/dc/applyMappingChanges.ts`
- Test: `www/src/Hooks/dc/applyMappingChanges.test.ts`

**Interfaces:**
- Consumes: `WebApi.getPinMappings`, `WebApi.setPinMappings`.
- Produces:
  - `applyMappingChanges(raw, workingActions): rawCopy` — deep-copies `raw` and sets
    `pin<NN>.action` for each pin in `workingActions` (NN zero-padded to 2), preserving
    everything else.
  - `saveRemap(workingActions, api?): Promise<void>` — `getPinMappings` → apply → `setPinMappings`.

- [ ] **Step 1: Write failing tests**

```ts
// www/src/Hooks/dc/applyMappingChanges.test.ts
import { describe, it, expect, vi } from 'vitest';
import { applyMappingChanges, saveRemap } from './applyMappingChanges';

const raw = {
  profileLabel: 'Profile 1',
  enabled: true,
  pin06: { action: 5, customButtonMask: 0, customDpadMask: 0 },
  pin07: { action: 6, customButtonMask: 0, customDpadMask: 0 },
};

describe('applyMappingChanges', () => {
  it('sets only the given pins actions and preserves everything else', () => {
    const out = applyMappingChanges(raw, { 6: 6 });
    expect(out.pin06.action).toBe(6);
    expect(out.pin06.customButtonMask).toBe(0);
    expect(out.pin07.action).toBe(6); // unchanged
    expect(out.profileLabel).toBe('Profile 1');
    expect(out.enabled).toBe(true);
    expect(raw.pin06.action).toBe(5); // original not mutated
  });
});

describe('saveRemap', () => {
  it('reads fresh mapping, applies changes, and writes', async () => {
    const api = {
      getPinMappings: vi.fn().mockResolvedValue(raw),
      setPinMappings: vi.fn().mockResolvedValue(true),
    };
    await saveRemap({ 6: 6 }, api);
    expect(api.getPinMappings).toHaveBeenCalled();
    expect(api.setPinMappings).toHaveBeenCalledWith(
      expect.objectContaining({ pin06: expect.objectContaining({ action: 6 }) }),
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd www && npx vitest run applyMappingChanges`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// www/src/Hooks/dc/applyMappingChanges.ts
// @ts-expect-error - WebApi.js is untyped JS
import WebApi from '../../Services/WebApi';

type RawMapping = Record<string, unknown>;
type PinEntry = { action: number; [k: string]: unknown };

export function applyMappingChanges(
  raw: RawMapping,
  workingActions: Record<number, number>,
): RawMapping {
  const copy: RawMapping = structuredClone(raw);
  for (const [pinStr, action] of Object.entries(workingActions)) {
    const key = `pin${String(pinStr).padStart(2, '0')}`;
    const entry = copy[key] as PinEntry | undefined;
    if (entry && typeof entry === 'object') entry.action = action;
  }
  return copy;
}

type MappingApi = {
  getPinMappings: () => Promise<RawMapping>;
  setPinMappings: (mappings: RawMapping) => Promise<unknown>;
};

const defaultApi: MappingApi = {
  getPinMappings: WebApi.getPinMappings,
  setPinMappings: WebApi.setPinMappings,
};

export async function saveRemap(
  workingActions: Record<number, number>,
  api: MappingApi = defaultApi,
): Promise<void> {
  const raw = await api.getPinMappings();
  const updated = applyMappingChanges(raw, workingActions);
  await api.setPinMappings(updated);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd www && npx vitest run applyMappingChanges`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add www/src/Hooks/dc/applyMappingChanges.ts www/src/Hooks/dc/applyMappingChanges.test.ts
git commit -m "feat(1a2): applyMappingChanges + saveRemap write path"
```

---

### Task 4: FunctionList component

**Files:**
- Create: `www/src/Components/dc/FunctionList.tsx`
- Test: `www/src/Components/dc/FunctionList.test.tsx`

**Interfaces:**
- Consumes: `ASSIGNABLE_FUNCTIONS`, `LayoutButtonKey` (Task 1).
- Produces: `<FunctionList selected onSelect labelFor />`
  - `selected: LayoutButtonKey | null`, `onSelect(key)`, `labelFor(key) => string`.
  - Renders each function as a button `data-testid="fn-<key>"` with `aria-pressed` when selected.

- [ ] **Step 1: Write failing tests**

```tsx
// www/src/Components/dc/FunctionList.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FunctionList from './FunctionList';

const labelFor = (k: string) => (k === 'B1' ? 'Cross' : k);

describe('FunctionList', () => {
  it('renders functions and reports selection', async () => {
    const onSelect = vi.fn();
    render(<FunctionList selected={null} onSelect={onSelect} labelFor={labelFor} />);
    await userEvent.click(screen.getByTestId('fn-B1'));
    expect(onSelect).toHaveBeenCalledWith('B1');
    expect(screen.getByTestId('fn-B1')).toHaveTextContent('Cross');
  });
  it('marks the selected function active', () => {
    render(<FunctionList selected="B2" onSelect={() => {}} labelFor={labelFor} />);
    expect(screen.getByTestId('fn-B2')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('fn-B1')).toHaveAttribute('aria-pressed', 'false');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd www && npx vitest run FunctionList`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement**

```tsx
// www/src/Components/dc/FunctionList.tsx
import { ASSIGNABLE_FUNCTIONS, type LayoutButtonKey } from '../../Data/dc/gpioActions';

type Props = {
  selected: LayoutButtonKey | null;
  onSelect: (key: LayoutButtonKey) => void;
  labelFor: (key: LayoutButtonKey) => string;
};

export default function FunctionList({ selected, onSelect, labelFor }: Props) {
  return (
    <div className="tw-flex tw-w-40 tw-shrink-0 tw-flex-col tw-gap-1">
      {ASSIGNABLE_FUNCTIONS.map((key) => (
        <button
          key={key}
          type="button"
          data-testid={`fn-${key}`}
          aria-pressed={selected === key}
          onClick={() => onSelect(key)}
          className={`tw-rounded tw-px-2 tw-py-1 tw-text-left tw-text-sm ${
            selected === key
              ? 'tw-bg-sky-600 tw-text-white'
              : 'tw-bg-slate-700 tw-text-slate-200'
          }`}
        >
          {labelFor(key)}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd www && npx vitest run FunctionList`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add www/src/Components/dc/FunctionList.tsx www/src/Components/dc/FunctionList.test.tsx
git commit -m "feat(1a2): FunctionList (selectable list of assignable functions)"
```

---

### Task 5: ControllerLayout edit props

**Files:**
- Modify: `www/src/Components/dc/ControllerLayout.tsx`
- Test: `www/src/Components/dc/ControllerLayout.test.tsx` (extend)

**Interfaces:**
- Adds optional props (non-edit behavior unchanged):
  - `onButtonClick?: (key: LayoutButtonKey) => void`
  - `overrideLabel?: (key: LayoutButtonKey) => string | undefined` — replaces the shown label when it returns a string.
  - `pendingKeys?: Set<LayoutButtonKey>` — adds `data-pending="true"` + a pending style.
  - A slot is interactive only when it is mapped **and** `onButtonClick` is provided.

- [ ] **Step 1: Add failing tests**

Append to `ControllerLayout.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

describe('ControllerLayout edit mode', () => {
  const mapping = [{ pin: 6, action: 5, buttonKey: 'B1' as const }];
  it('calls onButtonClick for a mapped button and shows override label + pending', async () => {
    const onButtonClick = vi.fn();
    render(
      <ControllerLayout
        layoutStyle="leverless"
        mapping={mapping}
        heldPins={[]}
        labelFor={(k) => k}
        onButtonClick={onButtonClick}
        overrideLabel={(k) => (k === 'B1' ? 'B2*' : undefined)}
        pendingKeys={new Set(['B1'])}
      />,
    );
    const b1 = screen.getByTestId('ctrl-btn-B1');
    expect(b1).toHaveTextContent('B2*');
    expect(b1).toHaveAttribute('data-pending', 'true');
    await userEvent.click(b1);
    expect(onButtonClick).toHaveBeenCalledWith('B1');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd www && npx vitest run ControllerLayout`
Expected: FAIL — override label/pending/click not implemented.

- [ ] **Step 3: Implement**

In `ControllerLayout.tsx`, extend `Props`:

```tsx
  onButtonClick?: (buttonKey: LayoutButtonKey) => void;
  overrideLabel?: (buttonKey: LayoutButtonKey) => string | undefined;
  pendingKeys?: Set<LayoutButtonKey>;
```

Inside the `.map`, replace the `<g>` with click + pending + override support:

```tsx
        const clickable = Boolean(mapped) && Boolean(onButtonClick);
        const pending = pendingKeys?.has(p.key) ?? false;
        const label = overrideLabel?.(p.key) ?? labelFor(p.key);
        return (
          <g
            key={p.key}
            data-testid={`ctrl-btn-${p.key}`}
            data-held={held ? 'true' : 'false'}
            data-pending={pending ? 'true' : 'false'}
            onClick={clickable ? () => onButtonClick?.(p.key) : undefined}
            style={clickable ? { cursor: 'pointer' } : undefined}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill={c.fill}
              stroke={pending ? '#f59e0b' : c.stroke}
              strokeWidth={pending ? 3 : 2}
            />
            <text x={p.x} y={p.y - 2} textAnchor="middle" fill={c.label} style={{ fontSize: '13px', fontWeight: 600 }}>
              {label}
            </text>
            {mapped && (
              <text x={p.x} y={p.y + 12} textAnchor="middle" fill={c.pin} style={{ fontSize: '9px' }}>
                {`Pin ${mapped.pin}`}
              </text>
            )}
          </g>
        );
```

(Keep the existing `colorsFor`/`mapped`/`held` lines above this block.)

- [ ] **Step 4: Run to verify pass**

Run: `cd www && npx vitest run ControllerLayout`
Expected: PASS (old + new tests).

- [ ] **Step 5: Commit**

```bash
git add www/src/Components/dc/ControllerLayout.tsx www/src/Components/dc/ControllerLayout.test.tsx
git commit -m "feat(1a2): ControllerLayout edit props (click, override label, pending)"
```

---

### Task 6: RemapBar + DC strings

**Files:**
- Create: `www/src/Components/dc/RemapBar.tsx`
- Test: `www/src/Components/dc/RemapBar.test.tsx`
- Modify: `www/src/Locales/en/DC.jsx`

**Interfaces:**
- Produces: `<RemapBar dirty pendingCount saving error onSave onRevert />`
  - Buttons "Save" (disabled unless `dirty`, shows saving state) and "Revert" (disabled unless `dirty`); a "N pending changes" indicator; an error line when `error`.
  - `data-testid` : `remap-save`, `remap-revert`, `remap-pending`, `remap-error`.

- [ ] **Step 1: Add DC strings**

Add to `www/src/Locales/en/DC.jsx`:

```js
	remap: 'Remap',
	'remap-exit': 'Done',
	'remap-save': 'Save',
	'remap-saving': 'Saving…',
	'remap-revert': 'Revert',
	'remap-pending': '{{count}} pending change(s)',
	'remap-none-pending': 'No changes',
	'remap-error': 'Save failed — try again',
	'remap-select-hint': 'Select a function, then click the buttons to assign it.',
```

- [ ] **Step 2: Write failing tests**

```tsx
// www/src/Components/dc/RemapBar.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RemapBar from './RemapBar';

describe('RemapBar', () => {
  it('enables Save/Revert only when dirty and reports clicks', async () => {
    const onSave = vi.fn();
    const onRevert = vi.fn();
    const { rerender } = render(
      <RemapBar dirty={false} pendingCount={0} saving={false} error={false} onSave={onSave} onRevert={onRevert} />,
    );
    expect(screen.getByTestId('remap-save')).toBeDisabled();
    rerender(
      <RemapBar dirty={true} pendingCount={2} saving={false} error={false} onSave={onSave} onRevert={onRevert} />,
    );
    expect(screen.getByTestId('remap-pending')).toHaveTextContent('2');
    await userEvent.click(screen.getByTestId('remap-save'));
    expect(onSave).toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('remap-revert'));
    expect(onRevert).toHaveBeenCalled();
  });
  it('shows an error line when error', () => {
    render(<RemapBar dirty pendingCount={1} saving={false} error onSave={() => {}} onRevert={() => {}} />);
    expect(screen.getByTestId('remap-error')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `cd www && npx vitest run RemapBar`
Expected: FAIL — component not found.

- [ ] **Step 4: Implement**

```tsx
// www/src/Components/dc/RemapBar.tsx
import { useTranslation } from 'react-i18next';

type Props = {
  dirty: boolean;
  pendingCount: number;
  saving: boolean;
  error: boolean;
  onSave: () => void;
  onRevert: () => void;
};

export default function RemapBar({ dirty, pendingCount, saving, error, onSave, onRevert }: Props) {
  const { t } = useTranslation('DC');
  return (
    <div className="tw-flex tw-items-center tw-gap-3">
      <span data-testid="remap-pending" className="tw-text-sm tw-text-slate-300">
        {dirty ? t('remap-pending', { count: pendingCount }) : t('remap-none-pending')}
      </span>
      <button
        type="button"
        data-testid="remap-save"
        disabled={!dirty || saving}
        onClick={onSave}
        className="tw-rounded tw-bg-sky-600 tw-px-3 tw-py-1 tw-text-sm tw-text-white disabled:tw-opacity-40"
      >
        {saving ? t('remap-saving') : t('remap-save')}
      </button>
      <button
        type="button"
        data-testid="remap-revert"
        disabled={!dirty || saving}
        onClick={onRevert}
        className="tw-rounded tw-border tw-border-slate-500 tw-px-3 tw-py-1 tw-text-sm tw-text-slate-200 disabled:tw-opacity-40"
      >
        {t('remap-revert')}
      </button>
      {error && (
        <span data-testid="remap-error" className="tw-text-sm tw-text-amber-400">
          {t('remap-error')}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run to verify pass**

Run: `cd www && npx vitest run RemapBar`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add www/src/Components/dc/RemapBar.tsx www/src/Components/dc/RemapBar.test.tsx www/src/Locales/en/DC.jsx
git commit -m "feat(1a2): RemapBar (save/revert/pending/error) + DC strings"
```

---

### Task 7: Wire Remap mode into ControllerViewPage

**Files:**
- Modify: `www/src/Pages/dc/ControllerViewPage.tsx`
- Test: `www/src/Pages/dc/ControllerViewPage.test.tsx` (extend)

**Interfaces:**
- Consumes: `FunctionList`, `RemapBar`, `useRemapState` (init/assign/pendingPins), `saveRemap`,
  `actionForButtonKey`, `buttonKeyForAction`, extended `ControllerLayout`.
- Produces: a **Remap** toggle button (`data-testid="remap-toggle"`). In remap mode:
  - pauses identify polling (pass `enabled=false` to `useHeldPinsMonitor`);
  - shows `FunctionList` + editable `ControllerLayout` (snapshot mapping) + `RemapBar`;
  - selecting a function then clicking a button assigns it (via snapshot pin);
  - Save calls `saveRemap(workingActions)`, then reloads mapping and exits dirty; Revert resets.

- [ ] **Step 1: Add a failing test**

Extend `ControllerViewPage.test.tsx` (add `saveRemap` mock + a remap test):

```tsx
vi.mock('../../Hooks/dc/applyMappingChanges', () => ({
  saveRemap: vi.fn().mockResolvedValue(undefined),
  applyMappingChanges: vi.fn(),
}));
import { saveRemap } from '../../Hooks/dc/applyMappingChanges';

it('remaps a button and saves', async () => {
  render(<ControllerViewPage />);
  await screen.findByTestId('ctrl-btn-B1');
  await userEvent.click(screen.getByTestId('remap-toggle'));
  await userEvent.click(screen.getByTestId('fn-B2'));      // select function B2
  await userEvent.click(screen.getByTestId('ctrl-btn-B1')); // assign to B1's pin
  expect(screen.getByTestId('ctrl-btn-B1')).toHaveAttribute('data-pending', 'true');
  await userEvent.click(screen.getByTestId('remap-save'));
  await waitFor(() => expect(saveRemap).toHaveBeenCalled());
});
```

(Add `import userEvent from '@testing-library/user-event';` at the top of the test file. The
existing `loadControllerMapping` mock already returns `[{ pin: 0, action: 5, buttonKey: 'B1' }]`;
update it to include the B2→action mapping is not required — the click assigns B2 to pin 0.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd www && npx vitest run ControllerViewPage`
Expected: FAIL — remap toggle/flow not present.

- [ ] **Step 3: Implement**

Update `ControllerViewPage.tsx`:
- Add imports: `useMemo`, `FunctionList`, `RemapBar`, `initRemapState`/`assignFunction`/`pendingPins` from `useRemapState`, `saveRemap` from `applyMappingChanges`, `actionForButtonKey`/`buttonKeyForAction` from `gpioActions`.
- Add state: `remapMode`, `selectedFn`, `remap` (RemapState), `saving`, `saveError`.
- When entering remap: `setRemap(initRemapState(mapping))`, `setRemapMode(true)`.
- `useHeldPinsMonitor(!remapMode)` (pause polling in remap).
- Snapshot lookup: `const pinByKey = useMemo(() => new Map(mapping?.map((m) => [m.buttonKey, m.pin])), [mapping])`.
- `overrideLabel(key)`: if remap, `pin = pinByKey.get(key); a = remap.workingActions[pin]; return labelFor(buttonKeyForAction(a) ?? key)`.
- `pendingKeys`: from `pendingPins(remap)` mapped back to their snapshot buttonKey (a pin's snapshot key is the mapping entry's buttonKey).
- `onButtonClick(key)`: `if (!selectedFn) return; const pin = pinByKey.get(key); setRemap(assignFunction(remap, pin, actionForButtonKey(selectedFn)))`.
- `onSave`: `setSaving(true); saveRemap(remap.workingActions).then(reloadMapping...).catch(()=>setSaveError(true)).finally(()=>setSaving(false))`.
- `onRevert`: `setRemap(initRemapState(mapping))`.
- Render: a `remap-toggle` button; when `remapMode`, render `FunctionList` (left) + editable `ControllerLayout` (pass onButtonClick/overrideLabel/pendingKeys) + `RemapBar`; else the existing identify view.

Reference implementation for the render body (remap branch):

```tsx
{remapMode ? (
  <div className="tw-space-y-3">
    <div className="tw-flex tw-items-center tw-justify-between">
      <span className="tw-text-sm tw-text-slate-400">{t('remap-select-hint')}</span>
      <RemapBar
        dirty={remap.dirty}
        pendingCount={pendingPins(remap).length}
        saving={saving}
        error={saveError}
        onSave={onSave}
        onRevert={onRevert}
      />
    </div>
    <div className="tw-flex tw-gap-4">
      <FunctionList selected={selectedFn} onSelect={setSelectedFn} labelFor={labelFor} />
      <div className="tw-flex-1">
        <ControllerLayout
          layoutStyle={style}
          mapping={mapping}
          heldPins={[]}
          labelFor={labelFor}
          onButtonClick={onButtonClick}
          overrideLabel={overrideLabel}
          pendingKeys={pendingKeySet}
        />
      </div>
    </div>
  </div>
) : (
  /* existing identify view: description + layout + SystemStatsPanel */
)}
```

Add the `remap-toggle` button in the header row next to `LayoutStyleSelector`.

- [ ] **Step 4: Run tests to verify pass**

Run: `cd www && npx vitest run ControllerViewPage`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add www/src/Pages/dc/ControllerViewPage.tsx www/src/Pages/dc/ControllerViewPage.test.tsx
git commit -m "feat(1a2): remap mode on the controller view (select function, click to assign, save)"
```

---

### Task 8: Full verification

**Files:**
- Create: `docs/phase-1a2-smoke-test.md`

- [ ] **Step 1: Lint + tests + build + size**

Run: `cd www && npm run lint:dc && npm test && npm run build && npm run size-check`
Expected: all pass; bundle within budget.

- [ ] **Step 2: Dev-server check (no hardware)**

`cd www && npm run dev`, open `http://localhost:3000/dc/controller`, click **Remap**, select a
function, click a button (it shows the new label + pending outline), click **Save** (the mock
`setPinMappings` accepts it), then **Revert** on a fresh edit discards.

- [ ] **Step 3: Write the smoke-test doc**

Create `docs/phase-1a2-smoke-test.md`: manual checklist — enter Remap, assign a function to a
button, Save, reload, confirm persistence; Revert discards; only wired buttons clickable;
on hardware confirm the remap takes effect in a game/tester.

- [ ] **Step 4: Commit + push**

```bash
git add docs/phase-1a2-smoke-test.md
git commit -m "docs(1a2): Phase 1A.2 smoke-test checklist"
git push -u origin phase-1a2-remap
```

---

## Self-Review

**Spec coverage:** Remap mode toggle (T7); function list (T4); clickable layout + overwrite (T5,T7); batch + Save/Revert + dirty (T2,T6,T7); write via setPinMappings with fresh read-merge (T3); only wired buttons clickable (T5 `mapped && onButtonClick`); duplicates allowed (T2 overwrite-only); i18n + lint gate (T6, T8). ✓

**Placeholder scan:** No TBD/TODO; all code complete except T7's render which gives a full reference block + explicit wiring list (the page integrates already-specified pieces).

**Type consistency:** `RemapState`/`workingActions` keyed by pin used consistently (T2,T3,T7); `actionForButtonKey`/`buttonKeyForAction` inverse pair (T1) used in T7; `ControllerLayout` new props (T5) match T7 usage; `RemapBar` prop names match its test and T7.

**Known limitation (from spec §10):** after Save + reload, duplicate functions collapse to a
single canonical slot in identify view (function-positioned picture can't show two pins for one
function). Editing stays unambiguous because remap renders the load-time snapshot (1:1) with
frozen positions.
