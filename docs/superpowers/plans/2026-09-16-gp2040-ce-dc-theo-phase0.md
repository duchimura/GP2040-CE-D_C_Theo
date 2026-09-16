# GP2040-CE-D_C_Theo — Phase 0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fork GP2040-CE and prove an end-to-end pipeline where a new, Tailwind/Radix-based UI reads and writes device config through the existing API and builds into a flashable firmware `.uf2`.

**Architecture:** Keep the upstream firmware and its HTTP/protobuf config API intact. Reuse the existing `www/` Vite + React 18 + TypeScript toolchain (including proto→TS generation and `makefsdata.js` fsdata packing). Add a new design system (Tailwind + Radix) that coexists with the incumbent React Bootstrap, and rebuild the app shell + one config round-trip in it. No new firmware C++ endpoints in Phase 0.

**Tech Stack:** Vite, React 18, TypeScript, Zustand (state, already present), Tailwind CSS (new), Radix primitives (new), Vitest + React Testing Library + jsdom (new). Build: `npm run build` → `www/build/` → `lib/httpd/fsdata.c`.

**Spec:** `docs/superpowers/specs/2026-09-16-gp2040-ce-dc-theo-phase0-design.md`

## Global Constraints

- **Flash-fit budget:** the built UI is deflate-compressed into `lib/httpd/fsdata.c` and compiled into firmware. Do not materially grow the bundle vs the stock baseline. A CI size budget guards this (Task 8).
- **Keep the existing toolchain:** Vite, the `build-proto` (pbjs → `src_gen/enums.ts`) step, `makefsdata.js`, the mock Express dev server, and `dev-board` mode all stay. Do not reinvent them.
- **Config schema types come from `@proto` (`src_gen/`)** — generated from the firmware `.proto` files. Do not hand-author config types.
- **API base:** all device calls go through `baseUrl` + `/api/*` as in `src/Services/WebApi.js`. `baseUrl` is `''` in production (same-origin device at `http://192.168.7.1`) and `VITE_DEV_BASE_URL` in dev.
- **Incremental design-system swap:** Tailwind + Radix coexist with React Bootstrap. Phase 0 does NOT remove React Bootstrap from untouched stock pages.
- **No new firmware endpoints** in Phase 0.
- **License/attribution:** retain MIT and upstream attribution.

---

### Task 1: Baseline build verification & repo hygiene

Establishes a known-good starting point and keeps generated artifacts out of commits.

**Files:**
- Modify: `.gitignore` (repo root)
- Modify: `www/README.md` (add project note pointing at spec/plan)

**Interfaces:**
- Consumes: nothing.
- Produces: a clean tree where `www/build/` and `lib/httpd/fsdata.c` are not committed as working changes.

- [ ] **Step 1: Confirm baseline build succeeds**

Run: `cd www && npm ci && npm run build`
Expected: exits 0; `www/build/index.html` exists; `lib/httpd/fsdata.c` is regenerated (git shows it modified).

- [ ] **Step 2: Ignore generated artifacts**

Append to `.gitignore` (root):

```
# Generated UI build artifacts
www/build/
```

Note: `lib/httpd/fsdata.c` is tracked upstream; leave it tracked but do NOT commit rebuilds as part of Phase 0 UI tasks unless a task explicitly says so.

- [ ] **Step 3: Add project note to README**

Add to the top of `www/README.md`:

```markdown
> **GP2040-CE-D_C_Theo** — a redesigned configurator UI (fork of GP2040-CE).
> Phase 0 design: `docs/superpowers/specs/2026-09-16-gp2040-ce-dc-theo-phase0-design.md`
> Phase 0 plan:   `docs/superpowers/plans/2026-09-16-gp2040-ce-dc-theo-phase0.md`
```

- [ ] **Step 4: Verify tree is clean of build artifacts**

Run: `git status --porcelain www/build` → Expected: no output (ignored).

- [ ] **Step 5: Commit**

```bash
git add .gitignore www/README.md
git commit -m "chore: baseline build verified; ignore www/build artifacts"
```

---

### Task 2: Vitest + React Testing Library setup

Adds the automated test harness the rest of the plan relies on.

**Files:**
- Modify: `www/package.json` (devDeps + `test` script)
- Create: `www/vitest.config.ts`
- Create: `www/src/test/setup.ts`
- Test: `www/src/test/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` runs Vitest in jsdom; RTL + `@testing-library/jest-dom` matchers available in every test via the setup file.

- [ ] **Step 1: Write the failing smoke test**

Create `www/src/test/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('test harness', () => {
  it('runs and has jsdom document', () => {
    expect(typeof document).toBe('object');
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 2: Run it to verify it fails (no runner yet)**

Run: `cd www && npm test`
Expected: FAIL — `test` script/`vitest` not found.

- [ ] **Step 3: Install and configure Vitest + RTL**

```bash
cd www
npm install -D vitest@^2 jsdom@^25 @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14
```

Add to `www/package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

Create `www/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@proto': path.resolve(__dirname, 'src_gen'),
      lodash: 'lodash-es',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
```

Create `www/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd www && npm test`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add www/package.json www/package-lock.json www/vitest.config.ts www/src/test/setup.ts www/src/test/smoke.test.ts
git commit -m "test: add Vitest + React Testing Library harness"
```

---

### Task 3: Tailwind + Radix design system (coexisting with Bootstrap)

Installs the new styling layer, prefixed so it cannot collide with Bootstrap classes on untouched pages.

**Files:**
- Modify: `www/package.json` (devDeps)
- Create: `www/tailwind.config.js`
- Create: `www/postcss.config.js`
- Create: `www/src/styles/tailwind.css`
- Modify: `www/src/index.jsx` (import the Tailwind stylesheet)
- Test: `www/src/test/tailwind-build.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: Tailwind utilities available under the `tw-` class prefix (e.g. `tw-flex`, `tw-bg-slate-900`); a `dc-` design-token layer on `:root`. Radix packages installed for use in later tasks.

- [ ] **Step 1: Write the failing test**

Create `www/src/test/tailwind-build.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('tailwind config', () => {
  it('uses the tw- prefix to avoid Bootstrap collisions', () => {
    const cfg = fs.readFileSync(
      path.resolve(__dirname, '../../tailwind.config.js'),
      'utf8',
    );
    expect(cfg).toContain("prefix: 'tw-'");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd www && npm test -- tailwind-build`
Expected: FAIL — `tailwind.config.js` does not exist.

- [ ] **Step 3: Install Tailwind, PostCSS, Radix**

```bash
cd www
npm install -D tailwindcss@^3 postcss@^8 autoprefixer@^10
npm install @radix-ui/react-dialog@^1 @radix-ui/react-tooltip@^1 @radix-ui/react-switch@^1
```

Create `www/tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  prefix: 'tw-',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  corePlugins: { preflight: false }, // don't reset styles Bootstrap relies on
  theme: { extend: {} },
  plugins: [],
};
```

Create `www/postcss.config.js`:

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

Create `www/src/styles/tailwind.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --dc-bg: #0f172a;
  --dc-surface: #1e293b;
  --dc-text: #e2e8f0;
  --dc-accent: #38bdf8;
}
```

- [ ] **Step 4: Import Tailwind in the app entry**

In `www/src/index.jsx`, add after the existing `./index.scss` import:

```jsx
import './styles/tailwind.css';
```

- [ ] **Step 5: Run the test and a build to verify pass + flash fit**

Run: `cd www && npm test -- tailwind-build` → Expected: PASS.
Run: `cd www && npm run build` → Expected: exits 0 (Tailwind in the PostCSS pipeline does not break the fsdata pack).

- [ ] **Step 6: Commit**

```bash
git add www/package.json www/package-lock.json www/tailwind.config.js www/postcss.config.js www/src/styles/tailwind.css www/src/index.jsx
git commit -m "feat: add Tailwind + Radix design system (tw- prefixed, coexists with Bootstrap)"
```

---

### Task 4: Connection-state store

A Zustand store that models device reachability and drives the UI shell.

**Files:**
- Create: `www/src/Store/useConnectionStore.ts`
- Test: `www/src/Store/useConnectionStore.test.ts`

**Interfaces:**
- Consumes: `baseUrl` from `src/Services/WebApi.js`.
- Produces:
  - `type ConnectionStatus = 'searching' | 'connected' | 'lost'`
  - `useConnectionStore` with state `{ status: ConnectionStatus }` and action `checkConnection(fetchImpl?: typeof fetch): Promise<ConnectionStatus>`.
  - `checkConnection` GETs `${baseUrl}/api/getGamepadOptions`; sets `connected` on ok response, `lost` on network error / non-ok. While in flight, status is `searching`.

- [ ] **Step 1: Write the failing tests**

Create `www/src/Store/useConnectionStore.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useConnectionStore } from './useConnectionStore';

beforeEach(() => {
  useConnectionStore.setState({ status: 'searching' });
});

describe('useConnectionStore.checkConnection', () => {
  it('sets connected on a successful response', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const result = await useConnectionStore.getState().checkConnection(fakeFetch as unknown as typeof fetch);
    expect(result).toBe('connected');
    expect(useConnectionStore.getState().status).toBe('connected');
  });

  it('sets lost on a network error', async () => {
    const fakeFetch = vi.fn().mockRejectedValue(new Error('network'));
    const result = await useConnectionStore.getState().checkConnection(fakeFetch as unknown as typeof fetch);
    expect(result).toBe('lost');
    expect(useConnectionStore.getState().status).toBe('lost');
  });

  it('sets lost on a non-ok response', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const result = await useConnectionStore.getState().checkConnection(fakeFetch as unknown as typeof fetch);
    expect(result).toBe('lost');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd www && npm test -- useConnectionStore`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the store**

Create `www/src/Store/useConnectionStore.ts`:

```ts
import { create } from 'zustand';
import { baseUrl } from '../Services/WebApi';

export type ConnectionStatus = 'searching' | 'connected' | 'lost';

interface ConnectionState {
  status: ConnectionStatus;
  checkConnection: (fetchImpl?: typeof fetch) => Promise<ConnectionStatus>;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'searching',
  checkConnection: async (fetchImpl = fetch) => {
    set({ status: 'searching' });
    try {
      const res = await fetchImpl(`${baseUrl}/api/getGamepadOptions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const next: ConnectionStatus = res.ok ? 'connected' : 'lost';
      set({ status: next });
      return next;
    } catch {
      set({ status: 'lost' });
      return 'lost';
    }
  },
}));
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd www && npm test -- useConnectionStore`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add www/src/Store/useConnectionStore.ts www/src/Store/useConnectionStore.test.ts
git commit -m "feat: add connection-state store (searching/connected/lost)"
```

---

### Task 5: Connection status banner (Radix + Tailwind)

The always-visible shell element that turns the connection store into clear, non-blank messaging.

**Files:**
- Create: `www/src/Components/dc/ConnectionBanner.tsx`
- Test: `www/src/Components/dc/ConnectionBanner.test.tsx`

**Interfaces:**
- Consumes: `useConnectionStore` (Task 4), Tailwind `tw-` utilities (Task 3).
- Produces: `<ConnectionBanner />` — renders one of three messages by status:
  - `searching` → "Searching for your controller…"
  - `connected` → "Controller connected"
  - `lost` → "Can't reach the controller. Plug it in via USB and open http://192.168.7.1"
  Each message container has `data-testid="connection-banner"` and `data-status={status}`.

- [ ] **Step 1: Write the failing tests**

Create `www/src/Components/dc/ConnectionBanner.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useConnectionStore } from '../../Store/useConnectionStore';
import ConnectionBanner from './ConnectionBanner';

beforeEach(() => useConnectionStore.setState({ status: 'searching' }));

describe('ConnectionBanner', () => {
  it('shows searching message', () => {
    useConnectionStore.setState({ status: 'searching' });
    render(<ConnectionBanner />);
    expect(screen.getByTestId('connection-banner')).toHaveAttribute('data-status', 'searching');
    expect(screen.getByText(/searching for your controller/i)).toBeInTheDocument();
  });

  it('shows lost message with recovery guidance', () => {
    useConnectionStore.setState({ status: 'lost' });
    render(<ConnectionBanner />);
    expect(screen.getByTestId('connection-banner')).toHaveAttribute('data-status', 'lost');
    expect(screen.getByText(/192\.168\.7\.1/)).toBeInTheDocument();
  });

  it('shows connected message', () => {
    useConnectionStore.setState({ status: 'connected' });
    render(<ConnectionBanner />);
    expect(screen.getByText(/controller connected/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd www && npm test -- ConnectionBanner`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement the component**

Create `www/src/Components/dc/ConnectionBanner.tsx`:

```tsx
import { useConnectionStore, type ConnectionStatus } from '../../Store/useConnectionStore';

const MESSAGES: Record<ConnectionStatus, string> = {
  searching: 'Searching for your controller…',
  connected: 'Controller connected',
  lost: "Can't reach the controller. Plug it in via USB and open http://192.168.7.1",
};

const STATUS_CLASS: Record<ConnectionStatus, string> = {
  searching: 'tw-bg-slate-700 tw-text-slate-100',
  connected: 'tw-bg-emerald-700 tw-text-white',
  lost: 'tw-bg-amber-700 tw-text-white',
};

export default function ConnectionBanner() {
  const status = useConnectionStore((s) => s.status);
  return (
    <div
      data-testid="connection-banner"
      data-status={status}
      role="status"
      className={`tw-w-full tw-px-4 tw-py-2 tw-text-sm ${STATUS_CLASS[status]}`}
    >
      {MESSAGES[status]}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd www && npm test -- ConnectionBanner`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add www/src/Components/dc/ConnectionBanner.tsx www/src/Components/dc/ConnectionBanner.test.tsx
git commit -m "feat: add connection status banner (Radix/Tailwind design system)"
```

---

### Task 6: General settings data hook (config read/write round-trip)

Wraps the existing typed API into a hook that reads and saves one real config value, with validation.

**Files:**
- Create: `www/src/Hooks/dc/useGeneralSettings.ts`
- Test: `www/src/Hooks/dc/useGeneralSettings.test.ts`

**Interfaces:**
- Consumes: `getGamepadOptions`, `setGamepadOptions` from `src/Services/WebApi.js`.
- Produces:
  - `type GeneralSettings = { inputMode: number; dpadMode: number; socdMode: number }`
  - `loadGeneralSettings(api?): Promise<GeneralSettings>` — reads via `getGamepadOptions`, picks the three fields.
  - `validateGeneralSettings(s: GeneralSettings): string[]` — returns error strings; each field must be an integer ≥ 0; `inputMode` must be 0–13.
  - `saveGeneralSettings(s, api?): Promise<void>` — throws `Error('invalid')` if validation fails, else calls `setGamepadOptions`.
  - `api` param default `{ getGamepadOptions, setGamepadOptions }` for test injection.

- [ ] **Step 1: Write the failing tests**

Create `www/src/Hooks/dc/useGeneralSettings.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import {
  loadGeneralSettings,
  validateGeneralSettings,
  saveGeneralSettings,
} from './useGeneralSettings';

describe('validateGeneralSettings', () => {
  it('accepts valid settings', () => {
    expect(validateGeneralSettings({ inputMode: 4, dpadMode: 0, socdMode: 2 })).toEqual([]);
  });
  it('rejects out-of-range inputMode', () => {
    const errs = validateGeneralSettings({ inputMode: 99, dpadMode: 0, socdMode: 0 });
    expect(errs.length).toBeGreaterThan(0);
  });
  it('rejects negative dpadMode', () => {
    const errs = validateGeneralSettings({ inputMode: 0, dpadMode: -1, socdMode: 0 });
    expect(errs.length).toBeGreaterThan(0);
  });
});

describe('loadGeneralSettings', () => {
  it('maps the three fields from getGamepadOptions', async () => {
    const api = {
      getGamepadOptions: vi.fn().mockResolvedValue({ inputMode: 4, dpadMode: 1, socdMode: 2, extra: 9 }),
      setGamepadOptions: vi.fn(),
    };
    const s = await loadGeneralSettings(api);
    expect(s).toEqual({ inputMode: 4, dpadMode: 1, socdMode: 2 });
  });
});

describe('saveGeneralSettings', () => {
  it('calls setGamepadOptions for valid settings', async () => {
    const api = { getGamepadOptions: vi.fn(), setGamepadOptions: vi.fn().mockResolvedValue({}) };
    await saveGeneralSettings({ inputMode: 4, dpadMode: 0, socdMode: 0 }, api);
    expect(api.setGamepadOptions).toHaveBeenCalledWith(
      expect.objectContaining({ inputMode: 4, dpadMode: 0, socdMode: 0 }),
    );
  });
  it('throws on invalid settings and does not call the API', async () => {
    const api = { getGamepadOptions: vi.fn(), setGamepadOptions: vi.fn() };
    await expect(saveGeneralSettings({ inputMode: 99, dpadMode: 0, socdMode: 0 }, api)).rejects.toThrow('invalid');
    expect(api.setGamepadOptions).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd www && npm test -- useGeneralSettings`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook module**

Create `www/src/Hooks/dc/useGeneralSettings.ts`:

```ts
// @ts-expect-error - WebApi.js is untyped JS
import { getGamepadOptions, setGamepadOptions } from '../../Services/WebApi';

export type GeneralSettings = { inputMode: number; dpadMode: number; socdMode: number };

type GamepadApi = {
  getGamepadOptions: (...args: unknown[]) => Promise<Record<string, number>>;
  setGamepadOptions: (options: Record<string, number>) => Promise<unknown>;
};

const defaultApi: GamepadApi = { getGamepadOptions, setGamepadOptions };

export async function loadGeneralSettings(api: GamepadApi = defaultApi): Promise<GeneralSettings> {
  const data = await api.getGamepadOptions();
  return { inputMode: data.inputMode, dpadMode: data.dpadMode, socdMode: data.socdMode };
}

export function validateGeneralSettings(s: GeneralSettings): string[] {
  const errors: string[] = [];
  const isNonNegInt = (n: number) => Number.isInteger(n) && n >= 0;
  if (!isNonNegInt(s.inputMode) || s.inputMode > 13) errors.push('inputMode must be an integer 0–13');
  if (!isNonNegInt(s.dpadMode)) errors.push('dpadMode must be a non-negative integer');
  if (!isNonNegInt(s.socdMode)) errors.push('socdMode must be a non-negative integer');
  return errors;
}

export async function saveGeneralSettings(s: GeneralSettings, api: GamepadApi = defaultApi): Promise<void> {
  if (validateGeneralSettings(s).length > 0) throw new Error('invalid');
  await api.setGamepadOptions(s);
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd www && npm test -- useGeneralSettings`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add www/src/Hooks/dc/useGeneralSettings.ts www/src/Hooks/dc/useGeneralSettings.test.ts
git commit -m "feat: general settings data hook (typed config read/write + validation)"
```

---

### Task 7: General settings page + app-shell wiring

The visible round-trip surface, wired into the app behind a new route, using the banner and hook.

**Files:**
- Create: `www/src/Pages/dc/GeneralSettingsPage.tsx`
- Test: `www/src/Pages/dc/GeneralSettingsPage.test.tsx`
- Modify: `www/src/App.tsx` (mount `<ConnectionBanner />`; add `/dc/settings` route)

**Interfaces:**
- Consumes: `loadGeneralSettings`, `saveGeneralSettings` (Task 6); `ConnectionBanner` (Task 5).
- Produces: `<GeneralSettingsPage />` — on mount loads settings and shows an input-mode number field (`data-testid="input-mode"`); a Save button (`data-testid="save-settings"`) calls `saveGeneralSettings`; shows `data-testid="save-status"` = "Saved" on success or "Save failed" on error.

- [ ] **Step 1: Write the failing tests**

Create `www/src/Pages/dc/GeneralSettingsPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../Hooks/dc/useGeneralSettings', () => ({
  loadGeneralSettings: vi.fn().mockResolvedValue({ inputMode: 4, dpadMode: 0, socdMode: 0 }),
  saveGeneralSettings: vi.fn().mockResolvedValue(undefined),
  validateGeneralSettings: vi.fn().mockReturnValue([]),
}));

import { loadGeneralSettings, saveGeneralSettings } from '../../Hooks/dc/useGeneralSettings';
import GeneralSettingsPage from './GeneralSettingsPage';

beforeEach(() => vi.clearAllMocks());

describe('GeneralSettingsPage', () => {
  it('loads current settings on mount', async () => {
    render(<GeneralSettingsPage />);
    await waitFor(() => expect(loadGeneralSettings).toHaveBeenCalled());
    expect((await screen.findByTestId('input-mode')) as HTMLInputElement).toHaveValue(4);
  });

  it('saves and shows confirmation', async () => {
    render(<GeneralSettingsPage />);
    await screen.findByTestId('input-mode');
    await userEvent.click(screen.getByTestId('save-settings'));
    await waitFor(() => expect(saveGeneralSettings).toHaveBeenCalled());
    expect(await screen.findByTestId('save-status')).toHaveTextContent(/saved/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd www && npm test -- GeneralSettingsPage`
Expected: FAIL — page not found.

- [ ] **Step 3: Implement the page**

Create `www/src/Pages/dc/GeneralSettingsPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import {
  loadGeneralSettings,
  saveGeneralSettings,
  type GeneralSettings,
} from '../../Hooks/dc/useGeneralSettings';

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    loadGeneralSettings().then(setSettings).catch(() => setStatus('Load failed'));
  }, []);

  if (!settings) return <div className="tw-p-4">Loading…</div>;

  const onSave = async () => {
    try {
      await saveGeneralSettings(settings);
      setStatus('Saved');
    } catch {
      setStatus('Save failed');
    }
  };

  return (
    <div className="tw-p-4 tw-space-y-4">
      <h1 className="tw-text-lg tw-font-semibold">General Settings</h1>
      <label className="tw-block">
        <span className="tw-mr-2">Input mode</span>
        <input
          data-testid="input-mode"
          type="number"
          className="tw-border tw-rounded tw-px-2 tw-py-1 tw-text-black"
          value={settings.inputMode}
          onChange={(e) => setSettings({ ...settings, inputMode: Number(e.target.value) })}
        />
      </label>
      <button
        data-testid="save-settings"
        className="tw-bg-sky-600 tw-text-white tw-rounded tw-px-3 tw-py-1"
        onClick={onSave}
      >
        Save
      </button>
      {status && <div data-testid="save-status">{status}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Wire into App**

In `www/src/App.tsx`: import `ConnectionBanner` and `GeneralSettingsPage`, render `<ConnectionBanner />` immediately inside `<Router>` above `<Navigation />`, and add:

```tsx
<Route path="/dc/settings" element={<GeneralSettingsPage />} />
```

- [ ] **Step 5: Run tests to verify pass**

Run: `cd www && npm test -- GeneralSettingsPage`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add www/src/Pages/dc/GeneralSettingsPage.tsx www/src/Pages/dc/GeneralSettingsPage.test.tsx www/src/App.tsx
git commit -m "feat: general settings page with config round-trip; mount connection banner"
```

---

### Task 8: Bundle-size budget in CI

Guards flash fit on every push.

**Files:**
- Create: `www/scripts/check-bundle-size.js`
- Modify: `www/package.json` (`size-check` script)
- Create: `.github/workflows/www-ci.yml`

**Interfaces:**
- Consumes: `npm run build` output in `www/build/`.
- Produces: `npm run size-check` exits non-zero if total gzipped `www/build/assets/*.js` exceeds a ceiling (initialize the ceiling from the measured baseline + 15% headroom — see Step 1).

- [ ] **Step 1: Measure the baseline**

Run: `cd www && npm run build` then measure total JS bytes:
`node -e "const fs=require('fs'),p='build/assets';let t=0;for(const f of fs.readdirSync(p))if(f.endsWith('.js'))t+=fs.statSync(p+'/'+f).size;console.log('total JS bytes:',t)"`
Record the number; set `MAX_BYTES` in Step 2 to `Math.ceil(baseline * 1.15)`.

- [ ] **Step 2: Write the size-check script**

Create `www/scripts/check-bundle-size.js` (replace `<MAX_BYTES>` with the value from Step 1):

```js
import fs from 'node:fs';
import path from 'node:path';

const MAX_BYTES = <MAX_BYTES>; // baseline + 15% headroom; raise deliberately, never silently
const assetsDir = path.join(process.cwd(), 'build', 'assets');

let total = 0;
for (const f of fs.readdirSync(assetsDir)) {
  if (f.endsWith('.js')) total += fs.statSync(path.join(assetsDir, f)).size;
}
console.log(`Total JS: ${total} bytes (budget ${MAX_BYTES})`);
if (total > MAX_BYTES) {
  console.error(`Bundle over budget by ${total - MAX_BYTES} bytes`);
  process.exit(1);
}
```

Add to `www/package.json` scripts: `"size-check": "node scripts/check-bundle-size.js"`.

- [ ] **Step 3: Verify locally**

Run: `cd www && npm run build && npm run size-check`
Expected: PASS (under budget).

- [ ] **Step 4: Add CI workflow**

Create `.github/workflows/www-ci.yml`:

```yaml
name: www-ci
on:
  push:
    branches: [main, phase-0-foundation]
  pull_request:
jobs:
  build-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: www
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm run size-check
```

- [ ] **Step 5: Commit**

```bash
git add www/scripts/check-bundle-size.js www/package.json .github/workflows/www-ci.yml
git commit -m "ci: bundle-size budget + build/test workflow for www"
```

---

### Task 9: Revert-to-stock bundle + dual-PC workflow docs

Delivers the safety net and the developer onboarding for both PCs.

**Files:**
- Create: `docs/revert-to-stock.md`
- Create: `docs/dual-pc-dev-workflow.md`

**Interfaces:**
- Consumes: nothing.
- Produces: user-facing docs. No code.

- [ ] **Step 1: Write the revert guide**

Create `docs/revert-to-stock.md` covering: what "revert" means (flash official stock GP2040-CE `.uf2`); how to enter BOOTSEL (hold BOOTSEL / short-circuit / hold the configured boot button while plugging in) so the board mounts as `RPI-RP2`; where to download the **exact matching upstream release** `.uf2` for the user's board from `github.com/OpenStickCommunity/GP2040-CE/releases`; drag-and-drop flashing; and a note that this fully restores the original interface. Include a placeholder table mapping "board → stock .uf2 filename" to fill per supported board.

- [ ] **Step 2: Write the dual-PC workflow guide**

Create `docs/dual-pc-dev-workflow.md` covering: clone `git clone https://github.com/duchimura/GP2040-CE-D_C_Theo.git` on both PCs; open in VS Code; `cd www && npm ci`; UI dev with `npm run dev` (mock server) or `npm run dev-board` (real device at 192.168.7.1); sync via `git pull` / `git push` on `phase-0-foundation`; and the firmware toolchain pointer (Pico SDK) referencing upstream build docs for producing the `.uf2`.

- [ ] **Step 3: Commit**

```bash
git add docs/revert-to-stock.md docs/dual-pc-dev-workflow.md
git commit -m "docs: revert-to-stock guide and dual-PC dev workflow"
```

---

### Task 10: Full Phase 0 verification & hardware smoke-test checklist

Confirms the whole pipeline and hands off the physical steps only a human can run.

**Files:**
- Create: `docs/phase-0-smoke-test.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a checked-in checklist and a green automated pipeline.

- [ ] **Step 1: Run the full automated gate**

Run: `cd www && npm ci && npm test && npm run build && npm run size-check`
Expected: all pass; `lib/httpd/fsdata.c` regenerated.

- [ ] **Step 2: Confirm the new UI is reachable in a dev build**

Run: `cd www && npm run dev` and load `http://localhost:3000/dc/settings`.
Expected: the General Settings page renders with the connection banner; against the mock server it loads a value and "Save" reports a result.

- [ ] **Step 3: Write the hardware smoke-test checklist**

Create `docs/phase-0-smoke-test.md` — a manual checklist (human-run):
1. Build firmware `.uf2` per upstream build docs (this repo's toolchain).
2. Flash via BOOTSEL to a real board.
3. Enter web-config (hold the config button / plug in) and open `http://192.168.7.1`.
4. Navigate to `/dc/settings`; confirm the connection banner shows "connected".
5. Change input mode, Save, power-cycle, reconnect, confirm the value persisted.
6. Flash the stock `.uf2` (per `docs/revert-to-stock.md`) and confirm the original interface returns.

- [ ] **Step 4: Commit**

```bash
git add docs/phase-0-smoke-test.md
git commit -m "docs: Phase 0 verification + hardware smoke-test checklist"
```

- [ ] **Step 5: Push the branch**

```bash
git push origin phase-0-foundation
```

---

## Self-Review

**Spec coverage:**
- Fork + adopt toolchain → Task 1. ✓
- Tailwind/Radix replacing design layer (coexist) → Task 3. ✓
- App shell + connection-state model (searching/connected/lost) → Tasks 4, 5, 7. ✓
- One real config round-trip (read/validate/write/confirm) → Tasks 6, 7. ✓
- Proto-generated types reused (not reinvented) → Global Constraints + Task 6 uses existing WebApi/`@proto`. ✓
- Build → fsdata → .uf2 verified (automated part) + hardware smoke test → Tasks 1, 8, 10. ✓
- Revert-to-stock bundle → Task 9. ✓
- Dual-PC workflow → Task 9. ✓
- Bundle-size budget (CI) → Task 8. ✓
- Vitest + RTL testing → Task 2, used throughout. ✓

**Placeholder scan:** `<MAX_BYTES>` in Task 8 is intentionally derived at Step 1 with an explicit formula, not a vague placeholder. Doc tasks (9, 10) specify exact section content. No "TBD"/"handle edge cases" left.

**Type consistency:** `ConnectionStatus` and `useConnectionStore` are consistent across Tasks 4/5/7. `GeneralSettings` and the `loadGeneralSettings`/`saveGeneralSettings`/`validateGeneralSettings` signatures are consistent across Tasks 6/7. `ConnectionBanner` `data-testid`/`data-status` contract matches its test.

**Note on hardware:** Steps that require a physical board (Task 10 Steps 3–6, i.e. flashing and on-device verification) cannot be executed in this environment and are handed off to the user as a checklist.
