# GP2040-CE-D_C_Theo — Mode Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make "D_C_Theo Version" a persistent global mode that substitutes our enhanced pages into the stock interface (Home + Pin Mapping → controller view) and hides our additions when OFF.

**Spec:** `docs/superpowers/specs/2026-09-16-gp2040-ce-dc-theo-mode-integration-design.md`

## Global Constraints

- Default mode ON; persist in `localStorage['dc.mode']` (try/catch).
- OFF renders original stock pages and hides the connection banner (keep only the toggle).
- Substitution is a registry (extensible). Reuse stock pages for the OFF path; no forking.
- i18n via `DC`; pass `npm run lint:dc`. No firmware changes.

---

### Task 1: dcMode store

**Files:** Create `www/src/Store/useDcMode.ts`; Test `www/src/Store/useDcMode.test.ts`

**Interfaces:** `useDcMode` (Zustand) `{ enabled: boolean; toggle(): void }`; `readInitialDcMode(): boolean` (default true).

- [ ] **Step 1: Failing test**

```ts
// www/src/Store/useDcMode.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDcMode, readInitialDcMode } from './useDcMode';

beforeEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });

describe('useDcMode', () => {
  it('defaults to enabled', () => {
    expect(readInitialDcMode()).toBe(true);
  });
  it('toggle flips and persists', () => {
    useDcMode.setState({ enabled: true });
    useDcMode.getState().toggle();
    expect(useDcMode.getState().enabled).toBe(false);
    expect(localStorage.getItem('dc.mode')).toBe('off');
  });
  it('readInitialDcMode reads a stored off value', () => {
    localStorage.setItem('dc.mode', 'off');
    expect(readInitialDcMode()).toBe(false);
  });
});
```

- [ ] **Step 2: Run — fails** (`cd www && npx vitest run useDcMode`)

- [ ] **Step 3: Implement**

```ts
// www/src/Store/useDcMode.ts
import { create } from 'zustand';

const KEY = 'dc.mode';

export function readInitialDcMode(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'; // default ON
  } catch {
    return true;
  }
}

function persist(enabled: boolean): void {
  try {
    localStorage.setItem(KEY, enabled ? 'on' : 'off');
  } catch {
    /* per-viewer convenience only */
  }
}

interface DcModeState {
  enabled: boolean;
  toggle: () => void;
}

export const useDcMode = create<DcModeState>((set, get) => ({
  enabled: readInitialDcMode(),
  toggle: () => {
    const next = !get().enabled;
    persist(next);
    set({ enabled: next });
  },
}));
```

- [ ] **Step 4: Run — passes**

- [ ] **Step 5: Commit** `feat(mode): persistent dcMode store (default ON)`

---

### Task 2: Route substitution registry

**Files:** Create `www/src/Data/dc/routeSubstitutions.tsx`; Test `www/src/Data/dc/routeSubstitutions.test.tsx`

**Interfaces:**
- `DC_ROUTE_SUBSTITUTIONS: Record<string, ReactNode>` for `'/'` and `'/pin-mapping'`.
- `dcElement(path: string, enabled: boolean, stock: ReactNode): ReactNode` — substitute when enabled & mapped, else stock.

- [ ] **Step 1: Failing test**

```tsx
// www/src/Data/dc/routeSubstitutions.test.tsx
import { describe, it, expect } from 'vitest';
import { DC_ROUTE_SUBSTITUTIONS, dcElement } from './routeSubstitutions';

describe('routeSubstitutions', () => {
  it('registers Home and Pin Mapping', () => {
    expect(Object.keys(DC_ROUTE_SUBSTITUTIONS)).toEqual(
      expect.arrayContaining(['/', '/pin-mapping']),
    );
  });
  it('dcElement substitutes only when enabled and mapped', () => {
    const stock = <div data-testid="stock" />;
    expect(dcElement('/pin-mapping', true, stock)).not.toBe(stock); // substituted
    expect(dcElement('/pin-mapping', false, stock)).toBe(stock);    // stock
    expect(dcElement('/settings', true, stock)).toBe(stock);        // unmapped -> stock
  });
});
```

- [ ] **Step 2: Run — fails**

- [ ] **Step 3: Implement**

```tsx
// www/src/Data/dc/routeSubstitutions.tsx
import type { ReactNode } from 'react';
import ControllerViewPage from '../../Pages/dc/ControllerViewPage';

export const DC_ROUTE_SUBSTITUTIONS: Record<string, ReactNode> = {
  '/': <ControllerViewPage />,
  '/pin-mapping': <ControllerViewPage />,
};

export function dcElement(
  path: string,
  enabled: boolean,
  stock: ReactNode,
): ReactNode {
  if (enabled && path in DC_ROUTE_SUBSTITUTIONS) {
    return DC_ROUTE_SUBSTITUTIONS[path];
  }
  return stock;
}
```

- [ ] **Step 4: Run — passes**

- [ ] **Step 5: Commit** `feat(mode): route substitution registry (Home + Pin Mapping)`

---

### Task 3: Wire App.tsx (banner + substituted routes)

**Files:** Modify `www/src/App.tsx`

- [ ] **Step 1: Implement**

- Import `useDcMode` and `dcElement`.
- Inside `App`: `const dcMode = useDcMode((s) => s.enabled);`
- Render banner conditionally: replace `<ConnectionBanner />` with `{dcMode && <ConnectionBanner />}`.
- Substitute the Home and Pin Mapping routes:

```tsx
<Route path="/" element={dcElement('/', dcMode, <HomePage />)} />
<Route path="/pin-mapping" element={dcElement('/pin-mapping', dcMode, <PinMappingPage />)} />
```

Leave all other routes and the existing `/dc/*` routes unchanged.

- [ ] **Step 2: Verify build + existing tests** (`cd www && npm test && npm run build`)
Expected: pass; no regressions.

- [ ] **Step 3: Commit** `feat(mode): App renders substituted pages + gates banner by dcMode`

---

### Task 4: Badge toggles the mode

**Files:** Modify `www/src/Components/Navigation.jsx`

- [ ] **Step 1: Implement**

- Remove `useNavigate`/`useLocation`/`inModifiedInterface`/`toggleInterface`.
- Add `import { useDcMode } from '../Store/useDcMode';` and
  `const dcEnabled = useDcMode((s) => s.enabled); const toggleDc = useDcMode((s) => s.toggle);`
- Badge button:
  - `onClick={toggleDc}`
  - `aria-pressed={dcEnabled}`
  - `title={dcEnabled ? t('DC:switch-to-original') : t('DC:switch-to-dc')}`
  - class: enabled → `tw-border-sky-600 tw-bg-sky-600 tw-text-white`; disabled →
    `tw-border-slate-600 tw-bg-slate-700 tw-text-slate-400`.

- [ ] **Step 2: Verify** `cd www && npm run lint:dc && npm test && npm run build`
Expected: pass.

- [ ] **Step 3: Commit** `feat(mode): D_C_Theo badge toggles persistent mode`

---

### Task 5: Verification

**Files:** Create `docs/mode-integration-smoke-test.md`

- [ ] **Step 1: Gate** `cd www && npm run lint:dc && npm test && npm run build && npm run size-check`
- [ ] **Step 2: Browser (dev):** load `/` (ON) → controller view + banner; Configuration ▸
  Pin Mapping → controller view; toggle badge OFF → stock Home + stock Pin Mapping, banner
  hidden, badge grey; reload → mode persists.
- [ ] **Step 3: Write `docs/mode-integration-smoke-test.md`** with the above steps + a
  hardware note.
- [ ] **Step 4: Commit + push** `docs(mode): smoke test`; `git push -u origin phase-2-mode-integration`

---

## Self-Review

**Coverage:** persistent mode (T1); substitution registry + Home/Pin Mapping (T2); App wiring
+ banner gate (T3); badge toggles mode (T4); verification (T5). ✓
**Placeholders:** none; all code complete.
**Types:** `useDcMode`/`readInitialDcMode` (T1) used in T2? no — T2 uses `dcElement`/registry;
T3/T4 consume `useDcMode` + `dcElement` with matching signatures. ✓
**Note:** Navigation is a stock JS file without a unit test; its toggle is covered by the
`useDcMode` unit test + the browser check (per spec §6).
