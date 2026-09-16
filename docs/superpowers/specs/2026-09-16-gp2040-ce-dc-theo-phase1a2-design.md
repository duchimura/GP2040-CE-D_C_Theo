# GP2040-CE-D_C_Theo — Phase 1A.2 — Remap Functions on the Controller View — Design Spec

- **Date:** 2026-09-16
- **Status:** Approved design (Phase 1A.2 scope)
- **Repo:** `github.com/duchimura/GP2040-CE-D_C_Theo`
- **Branch:** `phase-1a2-remap` (off `phase-1a-controller-view`)
- **Builds on:** Phase 1A (interactive controller view, `gpioActions`, layouts, mapping loader).

## 1. Purpose

Let the user **reassign which function each physical button performs**, directly on the
controller view, using a "pick a function, then click the buttons" flow — and write the
result to the device. This is the first sub-project that **writes** configuration.

## 2. Scope

**In scope:**
- A **Remap mode** on `/dc/controller` (toggle; identify mode from 1A stays the default).
- **Left:** a vertical, selectable **function list** (all GP2040 functions, labelled with
  the user's chosen label set).
- **Center:** the controller layout becomes **clickable**; clicking a button assigns the
  selected function to that button's GPIO pin.
- **Overwrite semantics:** clicking sets only that button's function; **duplicates allowed**
  (multiple buttons may share a function). Only **currently-wired** buttons are clickable.
- **Batch edit** with **Save** (writes via `setPinMappings`) and **Revert**; Save disabled
  unless there are pending changes; buttons stay in their snapshot positions while editing
  and reflow to canonical positions after Save + reload.

**Out of scope (deferred):**
- Assigning a function to a brand-new/unwired GPIO (needs press-to-capture; later).
- Editing non-button actions (addons, custom masks, hotkeys), profiles, or SOCD.
- Any firmware changes; the live visualizer (Phase 1B).

## 3. Grounding (existing API — reused)

- `getPinMappings()` → raw object `{ profileLabel, enabled, pin00: { action,
  customButtonMask, customDpadMask }, pin01: {...}, ... }`.
- `setPinMappings(mappings)` → POSTs **the same object shape** back. So a write is: take the
  raw mapping, change `pinNN.action` for edited pins (preserving all other fields), POST.
- `gpioActions.ts` (1A): `buttonKeyForAction(action)` and the action-key map. We add the
  inverse (`actionForButtonKey`) for writing.
- `MappedButton` (1A): `{ pin, action, buttonKey }` — the wired buttons currently shown.

## 4. Architecture & Components

### State / logic
- `src/Hooks/dc/useRemapState.ts` — a small reducer/helpers (pure, unit-tested):
  - `RemapState = { workingActions: Record<number, number>; dirty: boolean }` keyed by pin.
  - `initRemapState(mapping: MappedButton[]): RemapState` — seed working actions from the
    snapshot (pin → current action).
  - `assignFunction(state, pin, action): RemapState` — set one pin's action; recompute
    `dirty` vs the snapshot.
  - Snapshot of the original actions is captured at init for dirty comparison + Revert.
- `src/Hooks/dc/applyMappingChanges.ts`
  - `applyMappingChanges(raw, workingActions): rawCopy` — deep-copy the raw `getPinMappings`
    object and set `pin<NN>.action` for each pin in `workingActions`, leaving every other
    field untouched. Returns the object to hand to `setPinMappings`.
  - `saveRemap(workingActions, api?)` — `api.getPinMappings()` (fresh raw) →
    `applyMappingChanges` → `api.setPinMappings(updated)`. Defaults to WebApi funcs.

### Data
- Extend `gpioActions.ts` with:
  - `actionForButtonKey(key: LayoutButtonKey): number` — inverse of `buttonKeyForAction`,
    via `BUTTON_ACTIONS`.
  - `ASSIGNABLE_FUNCTIONS: LayoutButtonKey[]` — the ordered list for the function list.

### Components
- `src/Components/dc/FunctionList.tsx` — props `{ selected, onSelect, labelFor }`; renders
  `ASSIGNABLE_FUNCTIONS` as selectable rows; the selected row is visually active
  (`aria-pressed`). `data-testid="fn-<key>"`.
- `ControllerLayout` (extend, 1A): add optional edit props
  - `slotLabelForKey?: (key) => string | undefined` OR simpler: accept
    `displayActionByKey?: Record<LayoutButtonKey, number>` and `onButtonClick?(key)` and
    `pendingKeys?: Set<LayoutButtonKey>`.
  - When editing, the circle at a snapshot slot shows the **working** function's label and a
    **pending** style if changed; clicking calls `onButtonClick(key)`. Positions stay fixed
    (keyed by the snapshot slot), so buttons don't reflow mid-edit. Non-edit behavior is
    unchanged (press-to-identify).
- `src/Components/dc/RemapBar.tsx` — Save / Revert buttons + a "N pending changes" indicator;
  Save disabled when not dirty; shows a save error/success message.
- `ControllerViewPage` (extend): a **Remap** toggle; when on, snapshot the 1A mapping, render
  `FunctionList` + the editable layout + `RemapBar`; wire selection, click-assign, Save,
  Revert. Identify polling (`useHeldPinsMonitor`) is paused in remap mode to keep clicks and
  highlights unambiguous.

## 5. Data Flow

```
enter Remap:
  snapshot = mapping (MappedButton[] from 1A)     // positions + original actions
  state = initRemapState(snapshot)                 // workingActions per pin
select function F (from FunctionList)
click button at slot K:
  pin = snapshot pin for slot K
  state = assignFunction(state, pin, actionForButtonKey(F))  // overwrite, recompute dirty
  layout shows F's label at slot K, marked pending
Save:
  saveRemap(state.workingActions)  // fresh getPinMappings -> applyMappingChanges -> setPinMappings
  on success: exit dirty, reload mapping (buttons reflow)
Revert:
  state = initRemapState(snapshot)  // back to originals
```

## 6. Rules & Edge Cases

- **Overwrite the clicked button only;** never touch other buttons. Duplicates allowed.
- **Only wired buttons are clickable** (those present in the 1A snapshot). Unmapped slots are
  non-interactive in remap mode.
- **Save disabled** unless `dirty`. **Revert** restores the snapshot exactly.
- **Fresh read before write:** `saveRemap` re-reads `getPinMappings` and applies changes onto
  that, so unrelated fields/pins stay current even if the device changed.
- **Save failure:** surface a clear error in `RemapBar`; keep pending edits (do not discard).

## 7. Error Handling

- `getPinMappings`/`setPinMappings` failures are caught; the bar shows "Save failed — try
  again" and edits are preserved.
- Entering remap with an empty mapping shows the list but nothing clickable (no crash).

## 8. Testing

- **Unit (Vitest):**
  - `gpioActions`: `actionForButtonKey` round-trips with `buttonKeyForAction`;
    `ASSIGNABLE_FUNCTIONS` are all valid keys.
  - `useRemapState`: `initRemapState` seeds from snapshot; `assignFunction` overwrites one
    pin and sets `dirty`; reverting to the original action clears `dirty`.
  - `applyMappingChanges`: sets only the given pins' `action`, preserves `profileLabel`,
    `enabled`, other pins, and `customButtonMask`/`customDpadMask`.
  - `saveRemap`: reads fresh mapping, applies, calls `setPinMappings` with the merged object.
- **Component (RTL):**
  - `FunctionList`: renders functions; selecting one reports it and marks it active.
  - `ControllerLayout` (edit mode): clicking a wired button calls `onButtonClick`; a pending
    button shows the pending label + `data-pending="true"`; unmapped slots aren't clickable.
  - `ControllerViewPage` (remap): select a function, click a button → the button shows the
    new label and Save enables; Save calls the save path; Revert restores.
- **Manual (documented):** on mock/hardware — enter Remap, pick a function, click a button,
  Save, confirm persistence after reload; Revert discards.

## 9. Constraints (inherited)

- i18n: all new UI strings go through the `DC` namespace; code passes `npm run lint:dc`.
- Tailwind (`tw-`) + Radix; bundle-size budget; reuse WebApi default export + `Data/Pins`.
- New files under `src/**/dc/`. No firmware changes.

## 10. Open Questions / Risks

- **ControllerLayout dual-mode:** adding edit props risks bloating the component. Mitigation:
  keep edit inputs optional and compute all edit data in the page; if the component grows
  unwieldy, extract a shared `ControllerCanvas` renderer during implementation.
- **Label vs. function identity:** the function list is keyed by `LayoutButtonKey`; console
  labels (Square, etc.) are display-only via the label set, so switching label sets never
  changes what gets written.
