# GP2040-CE-D_C_Theo — Mode Integration — Design Spec

- **Date:** 2026-09-16
- **Status:** Approved design
- **Repo:** `github.com/duchimura/GP2040-CE-D_C_Theo`
- **Branch:** `phase-2-mode-integration` (off `phase-1a2-remap`)
- **Builds on:** Phase 0 / 1A / 1A.2 (controller view + remap, connection banner, /dc pages).

## 1. Purpose

Turn "D_C_Theo Version" from a per-click route jump into a **persistent global mode** that
**substitutes our enhanced pages into the stock interface in place** and lands on the
controller view — while **OFF** shows the original, untouched GP2040 interface.

## 2. Behavior

- **Persistent mode** `dcMode` (localStorage), **default ON**. The top-bar badge **toggles**
  it (no navigation); blue when ON, grey when OFF.
- **ON:**
  - **Landing (`/`)** renders our **Controller view** (mapping + System Stats).
  - The stock menu keeps its labels/structure; **substituted routes** render our pages:
    - `/` → Controller view
    - `/pin-mapping` (Configuration ▸ Pin Mapping) → Controller/Remap view
  - Non-substituted routes render their stock pages unchanged.
  - Our additions (the **connection banner**) are visible.
- **OFF (untouched stock):**
  - Every route renders the **original stock page** (including `/` = stock Home,
    `/pin-mapping` = stock Pin Mapping).
  - Our additions (connection banner) are **hidden**; only the small **toggle** remains in
    the bar.
- **Extensible:** the substitution set is a registry; future enhanced pages (e.g. an LED
  page → `/led-config`) are added by one map entry, no routing rewrite.

## 3. Architecture & Components

### State
- `src/Store/useDcMode.ts` — Zustand store:
  - `enabled: boolean` (init from `localStorage['dc.mode']`, default `true`).
  - `toggle(): void` — flip + persist (try/catch).
  - `readInitialDcMode(): boolean` helper (exported for tests/init).

### Substitution registry
- `src/Data/dc/routeSubstitutions.ts` — `DC_ROUTE_SUBSTITUTIONS: Record<string,
  React.ComponentType>` mapping stock path → our component:
  - `'/'`: `ControllerViewPage`
  - `'/pin-mapping'`: `ControllerViewPage`
  - `dcElement(path, mode, stock): ReactNode` helper — returns the substitute when `mode` and
    a mapping exists, else the stock element. Keeps `App.tsx` declarative.

### Wiring
- `src/App.tsx`:
  - Read `dcMode` from the store.
  - For substitutable routes, `element={dcElement('/pin-mapping', dcMode, <PinMappingPage/>)}`
    etc. (Home `'/'` similarly).
  - Render `<ConnectionBanner/>` only when `dcMode`.
- `src/Components/Navigation.jsx`:
  - Replace the `useNavigate`/`useLocation` toggle with `useDcMode` — the badge calls
    `toggle()`, `aria-pressed={enabled}`, blue when enabled / grey when not.

### Unchanged
- `ControllerViewPage` (identify + remap) is the substitute page as-is.
- `/dc/settings` route remains (direct link only; not part of the substitution set).

## 4. Data Flow

```
badge click -> useDcMode.toggle() -> persist -> re-render
route render: dcElement(path, enabled, <StockPage/>)
  enabled && DC_ROUTE_SUBSTITUTIONS[path]  -> our page
  else                                     -> stock page
ConnectionBanner: rendered only when enabled
```

## 5. Error Handling

- `localStorage` read/write wrapped in try/catch; default to ON if unavailable.
- No network changes; substitution is pure render-time selection.

## 6. Testing

- **Unit (Vitest):**
  - `useDcMode`: defaults to `true`; `toggle` flips and persists; `readInitialDcMode`
    reads a stored value (mock localStorage), defaults on error.
  - `routeSubstitutions`: registry contains `'/'` and `'/pin-mapping'`; `dcElement` returns
    the substitute when enabled + mapped, the stock node when disabled or unmapped.
- **Component (RTL):**
  - `Navigation` badge (light test or via page): clicking toggles the store `enabled`.
    (If Navigation is awkward to mount in isolation, cover the toggle via `useDcMode` unit
    test + browser check.)
- **Manual (documented):** ON lands on controller view; Configuration ▸ Pin Mapping shows
  our view; toggle OFF → stock Home + stock Pin Mapping, banner hidden, toggle greyed;
  toggle persists across reload.

## 7. Constraints (inherited)

- i18n via `DC` namespace; pass `npm run lint:dc`. Tailwind `tw-`; bundle-size budget.
- Reuse existing stock pages for the OFF path (do not fork them). No firmware changes.

## 8. Open Questions / Risks

- **Home route substitution:** stock `/` (`HomePage`) fetches system stats; our Controller
  view also shows System Stats — acceptable overlap, no conflict.
- **Deep-linking while OFF:** `/dc/*` direct routes still render our pages regardless of mode
  (they are our namespace); this is intentional for direct access and does not affect the
  stock menu.
