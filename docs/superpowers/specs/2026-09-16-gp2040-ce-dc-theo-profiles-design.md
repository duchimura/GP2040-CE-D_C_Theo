# GP2040-CE-D_C_Theo — Profiles in the Controller View — Design Spec

- **Date:** 2026-09-16
- **Status:** Approved design
- **Repo:** `github.com/duchimura/GP2040-CE-D_C_Theo`
- **Branch:** `feature-profiles` (off `main`)
- **Builds on:** Phase 1A / 1A.2 controller view + remap; mode integration.

## 1. Purpose

Keep GP2040's profile capability available in the D_C_Theo interface (it was on the stock
Pin Mapping page, which D_C_Theo mode substitutes with our controller view), with **full
parity** — select / rename / add / enable-disable / copy-from-base — and **share profiles
between the two interfaces** by reading and writing the same on-device profile config.

## 2. Grounding (reuse the stock profiles store)

`src/Store/useProfilesStore.ts` (stock, reused as-is) is the single source of truth:
- `profiles: PinsType[]` — index 0 = base profile, 1..N = alternatives. `MAX_PROFILES = 6`.
- `PinsType` = `{ pin00..pin29: { action, customButtonMask, customDpadMask }, profileLabel,
  enabled }`.
- `fetchProfiles()` = `getPinMappings()` (base) + `getProfileOptions()` (alternatives).
- `saveProfiles()` = `setPinMappings(base)` + `setProfileOptions(alternatives)`.
- Actions: `setProfilePin(index, pin, {action,...})`, `setProfileLabel`, `addProfile`,
  `toggleProfileEnabled`, `copyBaseProfile`.

Because our view uses this exact store + endpoints, **all profile edits are shared with the
stock UI** with no extra mechanism. No files (Export/Import is out of scope).

## 3. Scope

**In scope:**
- Our controller view reads the **selected profile** from `useProfilesStore` (not
  `getPinMappings` directly).
- A **Profiles bar**: selector (Profile 1…N), rename, Add (≤ MAX_PROFILES), Enable/disable,
  Copy-from-base.
- **Remap edits the selected profile** via `store.setProfilePin`; **Save** = `saveProfiles()`;
  **Revert** = `fetchProfiles()`. A page snapshot drives dirty + per-button pending.
- Supersede the Phase 1A.2 base-only write path (`useRemapState`, `applyMappingChanges`) —
  removed; the store owns saving now.

**Out of scope:**
- File Export/Import of profiles; setting the device's *active* profile (that is switched
  on-device / by the stock gamepad options — our selector is an EDIT selector only);
  firmware changes.

## 4. Architecture & Components

### Data
- `src/Data/dc/profileMapping.ts`
  - `profileToMappedButtons(profile: PinsType): MappedButton[]` — iterate `pin\d+` keys,
    map `action` via `buttonKeyForAction`, keep known buttons (reuses 1A logic).
  - `snapshotActions(profile): Record<number, number>` — pin→action for dirty/pending compare.

### Hook (view state over the store)
- `src/Hooks/dc/useProfilesView.ts`
  - Wraps `useProfilesStore` for the view: exposes `profiles`, `selectedIndex`,
    `setSelectedIndex`, `mapping` (selected profile → MappedButton[]), `dirty`,
    `pendingPinsForSelected`, and thin wrappers `assignFunctionToPin(pin, action)` (→
    `setProfilePin`), `rename`, `addProfile`, `toggleEnabled`, `copyFromBase`, `save`
    (→ `saveProfiles` then re-snapshot), `revert` (→ `fetchProfiles` then re-snapshot),
    `load` (fetch + snapshot on mount).
  - Holds the **snapshot** (deep copy of `profiles` at last fetch/save) to compute `dirty`
    and per-button pending for the selected profile.

### Components
- `src/Components/dc/ProfilesBar.tsx` — props: `profiles`, `selectedIndex`, `maxProfiles`,
  and callbacks (`onSelect`, `onRename`, `onAdd`, `onToggleEnabled`, `onCopyFromBase`).
  Renders a profile selector (buttons/dropdown), a rename input, Add (disabled at max),
  an Enable/disable switch (base profile always enabled/!toggleable), and Copy-from-base.
  `data-testid`: `profile-select-<i>`, `profile-rename`, `profile-add`, `profile-enable`,
  `profile-copy-base`.
- `ControllerViewPage` (rewire): use `useProfilesView` instead of
  `loadControllerMapping`/`useRemapState`/`saveRemap`. Render `ProfilesBar` above the layout
  in both identify and remap modes. Remap click → `assignFunctionToPin(pin, action)`.
  `RemapBar` Save/Revert/pending now come from `useProfilesView`.

### Removed
- `src/Hooks/dc/useRemapState.ts` (+ test) and `src/Hooks/dc/applyMappingChanges.ts`
  (+ test) — superseded by the store-backed path. `useControllerMapping` may remain for its
  parsing helper or be folded into `profileMapping`.

## 5. Data Flow

```
mount: useProfilesView.load() -> store.fetchProfiles() -> snapshot = deep copy(profiles)
select profile i -> selectedIndex = i; mapping = profileToMappedButtons(profiles[i])
identify: getHeldPins highlights held pins on the selected profile's mapping
remap click (function F on button->pin): store.setProfilePin(i, pinKey, { action: F })
  pending(button) = profiles[i].action(pin) !== snapshot[i].action(pin)
  dirty = any profile differs from snapshot (pins / label / enabled / count)
rename/add/enable/copy: corresponding store action (marks dirty via snapshot compare)
Save: store.saveProfiles() -> snapshot = deep copy(profiles)   // shared with stock
Revert: store.fetchProfiles() -> snapshot = deep copy(profiles)
```

## 6. Error Handling

- `fetchProfiles`/`saveProfiles` failures surface via `RemapBar` error (Save failed) and keep
  edits; a failed initial load shows the existing "waiting for controller…" state.
- `addProfile` no-ops at `MAX_PROFILES`; Enable toggle disabled for the base profile.

## 7. Testing

- **Unit (Vitest):**
  - `profileToMappedButtons`: parses a `PinsType` into `MappedButton[]`, dropping unmapped
    actions.
  - `useProfilesView` (mock `useProfilesStore`): selecting an index updates `mapping`;
    `assignFunctionToPin` calls `setProfilePin` and marks the button pending + dirty;
    `save`/`revert` call `saveProfiles`/`fetchProfiles` and reset dirty; `addProfile` respects
    `MAX_PROFILES`.
- **Component (RTL):**
  - `ProfilesBar`: selecting a profile calls `onSelect`; rename/add/enable/copy call their
    callbacks; Add disabled at max; base profile's enable control disabled.
  - `ControllerViewPage`: switching profile changes the rendered mapping; a remap-click writes
    to the selected profile; Save calls the store save; identify still highlights held pins.
- **Manual (documented):** edit a profile in D_C_Theo, Save, switch to stock Pin Mapping,
  confirm the change is there (and vice-versa); add/rename/enable a profile in our view and
  confirm it in stock.

## 8. Constraints (inherited)

- i18n via `DC` namespace; pass `npm run lint:dc`. Reuse the stock `useProfilesStore`
  unmodified (don't fork it). Tailwind `tw-`; bundle-size budget. No firmware changes.

## 9. Open Questions / Risks

- **Live store mutation:** editing mutates the shared store immediately (before Save), exactly
  like the stock page. Navigating away keeps unsaved edits in memory until a `fetchProfiles`;
  Revert reloads from the device. This matches stock behavior and is acceptable.
- **Active vs edit profile:** our selector chooses which profile to *edit/view*, not the
  device's currently-active profile. Documented in-UI via labels; setting the active profile
  stays a stock/gamepad-options concern.
- **`MappedButton` positions with duplicates:** unchanged from 1A/1A.2 (function-positioned
  layout); per-profile editing does not change that trade-off.
