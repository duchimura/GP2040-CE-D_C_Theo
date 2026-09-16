# GP2040-CE-D_C_Theo — Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Make the D_C_Theo controller view profile-aware (select/rename/add/enable/copy + per-profile remap) by reusing the stock `useProfilesStore`, so profiles are shared with the stock UI.

**Spec:** `docs/superpowers/specs/2026-09-16-gp2040-ce-dc-theo-profiles-design.md`

## Global Constraints

- Reuse stock `useProfilesStore` unmodified. Save via `saveProfiles()` (base + alternatives).
- Remap renders the **snapshot** profile mapping (stable positions) and overrides labels/pending
  from the current profile — no reflow mid-edit (as in 1A.2).
- i18n via `DC`; pass `npm run lint:dc`. No firmware changes.

---

### Task 1: profileMapping helpers

**Files:** Create `www/src/Data/dc/profileMapping.ts`; Test `www/src/Data/dc/profileMapping.test.ts`

**Interfaces:**
- `profileToMappedButtons(profile): MappedButton[]` — iterate `pin\d+` keys, map via `buttonKeyForAction`, keep known.
- `actionsByPin(profile): Record<number, number>` — pin→action for all `pin\d+` keys.

- [ ] **Step 1: Failing test**

```ts
// www/src/Data/dc/profileMapping.test.ts
import { describe, it, expect } from 'vitest';
import { profileToMappedButtons, actionsByPin } from './profileMapping';
import { BUTTON_ACTIONS } from '../Pins';

const profile = {
  profileLabel: 'Profile 1',
  enabled: true,
  pin06: { action: BUTTON_ACTIONS.BUTTON_PRESS_B1, customButtonMask: 0, customDpadMask: 0 },
  pin07: { action: BUTTON_ACTIONS.NONE, customButtonMask: 0, customDpadMask: 0 },
} as unknown as import('../../Store/useProfilesStore').PinsType;

describe('profileMapping', () => {
  it('maps wired buttons and drops NONE', () => {
    expect(profileToMappedButtons(profile)).toEqual([
      { pin: 6, action: BUTTON_ACTIONS.BUTTON_PRESS_B1, buttonKey: 'B1' },
    ]);
  });
  it('actionsByPin returns every pin action', () => {
    expect(actionsByPin(profile)).toEqual({ 6: BUTTON_ACTIONS.BUTTON_PRESS_B1, 7: BUTTON_ACTIONS.NONE });
  });
});
```

- [ ] **Step 2: Run — fails** (`cd www && npx vitest run profileMapping`)

- [ ] **Step 3: Implement**

```ts
// www/src/Data/dc/profileMapping.ts
import { buttonKeyForAction } from './gpioActions';
import type { MappedButton } from '../../Hooks/dc/useControllerMapping';
import type { PinsType } from '../../Store/useProfilesStore';

export function profileToMappedButtons(profile: PinsType): MappedButton[] {
  const out: MappedButton[] = [];
  for (const [key, value] of Object.entries(profile)) {
    const m = /^pin(\d+)$/.exec(key);
    if (!m) continue;
    const action = (value as { action?: number })?.action;
    if (typeof action !== 'number') continue;
    const buttonKey = buttonKeyForAction(action);
    if (!buttonKey) continue;
    out.push({ pin: Number(m[1]), action, buttonKey });
  }
  return out;
}

export function actionsByPin(profile: PinsType): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [key, value] of Object.entries(profile)) {
    const m = /^pin(\d+)$/.exec(key);
    if (!m) continue;
    const action = (value as { action?: number })?.action;
    if (typeof action === 'number') out[Number(m[1])] = action;
  }
  return out;
}
```

- [ ] **Step 4: Run — passes**
- [ ] **Step 5: Commit** `feat(profiles): profileToMappedButtons + actionsByPin helpers`

---

### Task 2: useProfilesView hook

**Files:** Create `www/src/Hooks/dc/useProfilesView.ts`; Test `www/src/Hooks/dc/useProfilesView.test.ts`

**Interfaces:** returns `{ profiles, selectedIndex, setSelectedIndex, loading, error, dirty,
maxProfiles, currentMapping, snapshotMapping, currentActions, snapshotActions,
assignFunctionToPin(pin,action), rename(label), addProfile(), toggleEnabled(index),
copyFromBase(), load(), save(), revert() }`.

- Snapshot (deep clone of `profiles`) taken on `load`/`save`/`revert`; `dirty` is a boolean set
  by edit wrappers and cleared by load/save/revert.
- `currentMapping`/`currentActions` from `profiles[selectedIndex]`;
  `snapshotMapping`/`snapshotActions` from the snapshot's selected profile.

- [ ] **Step 1: Failing test** (mock the store)

```ts
// www/src/Hooks/dc/useProfilesView.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const store = {
  profiles: [
    { profileLabel: 'P1', enabled: true, pin06: { action: 5, customButtonMask: 0, customDpadMask: 0 } },
  ],
  loadingProfiles: false,
  fetchProfiles: vi.fn(),
  saveProfiles: vi.fn().mockResolvedValue({}),
  setProfilePin: vi.fn(),
  setProfileLabel: vi.fn(),
  addProfile: vi.fn(),
  toggleProfileEnabled: vi.fn(),
  copyBaseProfile: vi.fn(),
};
vi.mock('../../Store/useProfilesStore', () => ({
  __esModule: true,
  MAX_PROFILES: 6,
  default: Object.assign((sel: (s: typeof store) => unknown) => sel(store), {
    getState: () => store,
  }),
}));

import { useProfilesView } from './useProfilesView';

beforeEach(() => vi.clearAllMocks());

describe('useProfilesView', () => {
  it('exposes mapping for the selected profile and assigns via the store', async () => {
    const { result } = renderHook(() => useProfilesView());
    await act(async () => { await result.current.load(); });
    expect(result.current.currentMapping).toEqual([{ pin: 6, action: 5, buttonKey: 'B1' }]);
    act(() => result.current.assignFunctionToPin(6, 6));
    expect(store.setProfilePin).toHaveBeenCalledWith(0, 'pin06', expect.objectContaining({ action: 6 }));
    expect(result.current.dirty).toBe(true);
  });
  it('save calls saveProfiles and clears dirty', async () => {
    const { result } = renderHook(() => useProfilesView());
    await act(async () => { await result.current.load(); });
    act(() => result.current.rename('New'));
    expect(store.setProfileLabel).toHaveBeenCalledWith(0, 'New');
    await act(async () => { await result.current.save(); });
    expect(store.saveProfiles).toHaveBeenCalled();
    expect(result.current.dirty).toBe(false);
  });
});
```

- [ ] **Step 2: Run — fails**

- [ ] **Step 3: Implement**

```ts
// www/src/Hooks/dc/useProfilesView.ts
import { useCallback, useMemo, useState } from 'react';
import useProfilesStore, {
  MAX_PROFILES,
  type PinsType,
} from '../../Store/useProfilesStore';
import { profileToMappedButtons, actionsByPin } from '../../Data/dc/profileMapping';

const pinKey = (pin: number) => `pin${String(pin).padStart(2, '0')}`;

export function useProfilesView() {
  const profiles = useProfilesStore((s) => s.profiles);
  const loading = useProfilesStore((s) => s.loadingProfiles);
  const fetchProfiles = useProfilesStore((s) => s.fetchProfiles);
  const saveProfiles = useProfilesStore((s) => s.saveProfiles);
  const setProfilePin = useProfilesStore((s) => s.setProfilePin);
  const setProfileLabel = useProfilesStore((s) => s.setProfileLabel);
  const addProfileAction = useProfilesStore((s) => s.addProfile);
  const toggleProfileEnabled = useProfilesStore((s) => s.toggleProfileEnabled);
  const copyBaseProfile = useProfilesStore((s) => s.copyBaseProfile);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapshot, setSnapshot] = useState<PinsType[]>([]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(false);

  const takeSnapshot = useCallback(() => {
    const ps = useProfilesStore.getState().profiles;
    setSnapshot(structuredClone(ps));
    setDirty(false);
  }, []);

  const load = useCallback(async () => {
    setError(false);
    try {
      await fetchProfiles();
      takeSnapshot();
    } catch {
      setError(true);
    }
  }, [fetchProfiles, takeSnapshot]);

  const save = useCallback(async () => {
    setError(false);
    try {
      await saveProfiles();
      takeSnapshot();
    } catch {
      setError(true);
    }
  }, [saveProfiles, takeSnapshot]);

  const revert = useCallback(async () => {
    setError(false);
    try {
      await fetchProfiles();
      takeSnapshot();
    } catch {
      setError(true);
    }
  }, [fetchProfiles, takeSnapshot]);

  const clampIndex = (i: number) => Math.max(0, Math.min(i, profiles.length - 1));
  const current = profiles[clampIndex(selectedIndex)];
  const snap = snapshot[clampIndex(selectedIndex)];

  const currentMapping = useMemo(
    () => (current ? profileToMappedButtons(current) : []),
    [current],
  );
  const snapshotMapping = useMemo(
    () => (snap ? profileToMappedButtons(snap) : currentMapping),
    [snap, currentMapping],
  );
  const currentActions = useMemo(() => (current ? actionsByPin(current) : {}), [current]);
  const snapshotActions = useMemo(
    () => (snap ? actionsByPin(snap) : currentActions),
    [snap, currentActions],
  );

  const assignFunctionToPin = (pin: number, action: number) => {
    setProfilePin(clampIndex(selectedIndex), pinKey(pin), {
      action,
      customButtonMask: 0,
      customDpadMask: 0,
    });
    setDirty(true);
  };
  const rename = (label: string) => {
    setProfileLabel(clampIndex(selectedIndex), label);
    setDirty(true);
  };
  const addProfile = () => {
    addProfileAction();
    setDirty(true);
  };
  const toggleEnabled = (index: number) => {
    toggleProfileEnabled(index);
    setDirty(true);
  };
  const copyFromBase = () => {
    copyBaseProfile(clampIndex(selectedIndex));
    setDirty(true);
  };

  return {
    profiles,
    selectedIndex: clampIndex(selectedIndex),
    setSelectedIndex,
    loading,
    error,
    dirty,
    maxProfiles: MAX_PROFILES,
    currentMapping,
    snapshotMapping,
    currentActions,
    snapshotActions,
    assignFunctionToPin,
    rename,
    addProfile,
    toggleEnabled,
    copyFromBase,
    load,
    save,
    revert,
  };
}
```

- [ ] **Step 4: Run — passes**
- [ ] **Step 5: Commit** `feat(profiles): useProfilesView (store-backed, snapshot dirty/pending)`

---

### Task 3: ProfilesBar + DC strings

**Files:** Create `www/src/Components/dc/ProfilesBar.tsx`; Test `www/src/Components/dc/ProfilesBar.test.tsx`; Modify `www/src/Locales/en/DC.jsx`

**Interfaces:** `<ProfilesBar profiles selectedIndex maxProfiles onSelect onRename onAdd onToggleEnabled onCopyFromBase />`.

- [ ] **Step 1: DC strings** — add to `DC.jsx`:

```js
	profiles: 'Profiles',
	'profile-rename': 'Profile name',
	'profile-add': 'Add profile',
	'profile-enabled': 'Enabled',
	'profile-copy-base': 'Copy from base',
	'profile-n': 'Profile {{n}}',
```

- [ ] **Step 2: Failing test**

```tsx
// www/src/Components/dc/ProfilesBar.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilesBar from './ProfilesBar';

const profiles = [
  { profileLabel: 'P1', enabled: true },
  { profileLabel: 'P2', enabled: false },
] as never[];

function setup(over = {}) {
  const props = {
    profiles, selectedIndex: 0, maxProfiles: 6,
    onSelect: vi.fn(), onRename: vi.fn(), onAdd: vi.fn(),
    onToggleEnabled: vi.fn(), onCopyFromBase: vi.fn(), ...over,
  };
  render(<ProfilesBar {...props} />);
  return props;
}

describe('ProfilesBar', () => {
  it('selects a profile', async () => {
    const p = setup();
    await userEvent.click(screen.getByTestId('profile-select-1'));
    expect(p.onSelect).toHaveBeenCalledWith(1);
  });
  it('adds, copies, and toggles enable', async () => {
    const p = setup({ selectedIndex: 1 });
    await userEvent.click(screen.getByTestId('profile-add'));
    await userEvent.click(screen.getByTestId('profile-copy-base'));
    await userEvent.click(screen.getByTestId('profile-enable'));
    expect(p.onAdd).toHaveBeenCalled();
    expect(p.onCopyFromBase).toHaveBeenCalled();
    expect(p.onToggleEnabled).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 3: Run — fails**

- [ ] **Step 4: Implement**

```tsx
// www/src/Components/dc/ProfilesBar.tsx
import { useTranslation } from 'react-i18next';
import type { PinsType } from '../../Store/useProfilesStore';

type Props = {
  profiles: PinsType[];
  selectedIndex: number;
  maxProfiles: number;
  onSelect: (index: number) => void;
  onRename: (label: string) => void;
  onAdd: () => void;
  onToggleEnabled: (index: number) => void;
  onCopyFromBase: () => void;
};

export default function ProfilesBar({
  profiles, selectedIndex, maxProfiles,
  onSelect, onRename, onAdd, onToggleEnabled, onCopyFromBase,
}: Props) {
  const { t } = useTranslation('DC');
  const selected = profiles[selectedIndex];
  const isBase = selectedIndex === 0;
  return (
    <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
      <span className="tw-text-sm tw-font-semibold tw-text-slate-300">{t('profiles')}</span>
      <div className="tw-inline-flex tw-overflow-hidden tw-rounded tw-border tw-border-slate-600">
        {profiles.map((p, i) => (
          <button
            key={i}
            type="button"
            data-testid={`profile-select-${i}`}
            aria-pressed={i === selectedIndex}
            onClick={() => onSelect(i)}
            className={`tw-px-3 tw-py-1 tw-text-sm ${
              i === selectedIndex ? 'tw-bg-sky-600 tw-text-white' : 'tw-bg-transparent tw-text-slate-300'
            }`}
          >
            {p.profileLabel || t('profile-n', { n: i + 1 })}
          </button>
        ))}
      </div>
      <input
        data-testid="profile-rename"
        className="tw-w-40 tw-rounded tw-border tw-border-slate-600 tw-bg-slate-800 tw-px-2 tw-py-1 tw-text-sm tw-text-slate-100"
        value={selected?.profileLabel ?? ''}
        placeholder={t('profile-rename')}
        onChange={(e) => onRename(e.target.value)}
      />
      <button
        type="button"
        data-testid="profile-add"
        disabled={profiles.length >= maxProfiles}
        onClick={onAdd}
        className="tw-rounded tw-border tw-border-slate-500 tw-px-2 tw-py-1 tw-text-sm tw-text-slate-200 disabled:tw-opacity-40"
      >
        {t('profile-add')}
      </button>
      <button
        type="button"
        data-testid="profile-copy-base"
        disabled={isBase}
        onClick={onCopyFromBase}
        className="tw-rounded tw-border tw-border-slate-500 tw-px-2 tw-py-1 tw-text-sm tw-text-slate-200 disabled:tw-opacity-40"
      >
        {t('profile-copy-base')}
      </button>
      <label className="tw-flex tw-items-center tw-gap-1 tw-text-sm tw-text-slate-300">
        <input
          type="checkbox"
          data-testid="profile-enable"
          disabled={isBase}
          checked={Boolean(selected?.enabled)}
          onChange={() => onToggleEnabled(selectedIndex)}
        />
        {t('profile-enabled')}
      </label>
    </div>
  );
}
```

- [ ] **Step 5: Run — passes**
- [ ] **Step 6: Commit** `feat(profiles): ProfilesBar + DC strings`

---

### Task 4: Rewire ControllerViewPage to profiles; remove superseded 1A.2 write path

**Files:** Modify `www/src/Pages/dc/ControllerViewPage.tsx` and its test; Delete
`www/src/Hooks/dc/useRemapState.ts` (+test) and `www/src/Hooks/dc/applyMappingChanges.ts` (+test).

- [ ] **Step 1: Rewire the page**

- Replace `loadControllerMapping`/`useRemapState`/`saveRemap` usage with `useProfilesView`.
- On mount call `view.load()`.
- Render `<ProfilesBar ... />` above the layout (both modes), wired to view callbacks + `setSelectedIndex`.
- Identify mode: `mapping = view.currentMapping`.
- Remap mode: `mapping = view.snapshotMapping`; `overrideLabel(key)` from `view.currentActions[pin]`;
  `pendingKeys` = snapshotMapping buttons where `currentActions[pin] !== snapshotActions[pin]`;
  `onButtonClick(key)` → `view.assignFunctionToPin(pin, actionForButtonKey(selectedFn))`.
- `RemapBar`: `dirty={view.dirty}`, `pendingCount`, `saving` (local), `error={view.error}`,
  `onSave={() => view.save()}`, `onRevert={() => view.revert()}`.
- Waiting state: while `view.profiles.length === 0` show `ctrl-waiting`.

- [ ] **Step 2: Update the page test** — mock `../../Hooks/dc/useProfilesView` returning a small
  view object (profiles with one B1 pin, currentMapping `[{pin:0,action:5,buttonKey:'B1'}]`,
  snapshotMapping same, currentActions `{0:5}`, snapshotActions `{0:5}`, spies for load/save/
  assignFunctionToPin/etc.). Keep the two existing behaviors: renders `ctrl-btn-B1`; remap
  toggle → select `fn-B2` → click `ctrl-btn-B1` calls `assignFunctionToPin`; `remap-save` calls
  `view.save`. Remove the `applyMappingChanges` mock.

- [ ] **Step 3: Delete superseded files**

```bash
git rm www/src/Hooks/dc/useRemapState.ts www/src/Hooks/dc/useRemapState.test.ts \
       www/src/Hooks/dc/applyMappingChanges.ts www/src/Hooks/dc/applyMappingChanges.test.ts
```

- [ ] **Step 4: Verify** `cd www && npm run lint:dc && npm test && npm run build`
Expected: pass (no dangling imports).

- [ ] **Step 5: Commit** `feat(profiles): controller view uses profiles store; remove 1A.2 base-only write path`

---

### Task 5: Verification

**Files:** Create `docs/profiles-smoke-test.md`

- [ ] **Step 1: Gate** `cd www && npm run lint:dc && npm test && npm run build && npm run size-check`
- [ ] **Step 2: Browser (dev):** at `/` (ON), a **Profiles** bar shows; switch profiles →
  mapping changes; Remap → assign a function to a button on Profile 2 → Save; toggle D_C_Theo
  OFF → stock Pin Mapping shows the same Profile 2 change; add/rename/enable a profile in our
  view and confirm it in stock.
- [ ] **Step 3: Write `docs/profiles-smoke-test.md`** (the above + hardware note).
- [ ] **Step 4: Commit + push** `docs(profiles): smoke test`; `git push -u origin feature-profiles`

---

## Self-Review

**Coverage:** profile parsing (T1); store-backed view state + dirty/pending + save/revert (T2);
ProfilesBar select/rename/add/enable/copy (T3); page rewire + supersede old path (T4);
verification incl. cross-UI sharing (T5). ✓
**Placeholders:** none; all code complete.
**Types:** `PinsType`/`MappedButton` reused; `useProfilesView` surface consumed by the page in
T4 matches T2; `ProfilesBar` props (T3) match the page wiring (T4). ✓
**Sharing:** guaranteed by reusing `useProfilesStore.saveProfiles` (setPinMappings +
setProfileOptions) — same endpoints as stock (spec §2). ✓
