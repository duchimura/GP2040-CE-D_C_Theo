# GP2040-CE-D_C_Theo — Phase 0 Foundation — Design Spec

- **Date:** 2026-09-16
- **Status:** Approved design (Phase 0 scope)
- **Repo:** `github.com/duchimura/GP2040-CE-D_C_Theo` (fork of `OpenStickCommunity/GP2040-CE`, MIT)

## 1. Purpose & Vision

Build a new, visually attractive, and more efficient **web interface for programming
GP2040-CE fight sticks**. Current GP2040-CE config tooling is functional but utilitarian
(Bootstrap forms, GPIO pin tables) and forces trial-and-error for wiring discovery and
manual controller-layout selection. This project replaces the embedded web UI with a
modern, guided experience while preserving the exact connection method existing users
already know.

The full vision is delivered in phases. **This spec covers Phase 0 only.**

### Phasing (context)

- **Phase 0 — Foundation (this spec).** Fork GP2040-CE, adopt its existing UI toolchain,
  replace the design/component layer with our new design system, prove the app still
  builds → `fsdata` → `.uf2`, flashes, connects at `http://192.168.7.1`, and reads/writes
  config through the existing API in the new UI. Establish the dual-PC dev workflow and the
  revert-to-stock bundle.
- **Phase 1 — Flagship differentiators.** Auto-detect & display the correct interactive
  controller layout; guided physical-button → pin detection wizard; live input visualizer.
- **Phase 2 — Power features.** Profiles & quick-switch with shareable configs; visual LED
  theme designer; timeline macro editor.
- **Phase 3 — Polish/optional.** WebSocket real-time input, mobile responsiveness,
  onboarding wizard.

## 2. Architecture (approved: "Approach A")

- **Fork** `OpenStickCommunity/GP2040-CE` → `duchimura/GP2040-CE-D_C_Theo`.
- **Keep the C++ firmware and its HTTP/protobuf config API essentially intact.** No new
  firmware endpoints in Phase 0.
- **Reuse the existing `www/` toolchain, replace the UI layer.** The upstream `www/` is
  already Vite + React 18 + TypeScript, already generates TS types from the `.proto` files
  (`build-proto` via `pbjs` → `src_gen/`), already packs the build into `fsdata.c`
  (`makefsdata.js`), and already ships a mock Express dev server plus a `dev-board` mode
  that targets a real device at `192.168.7.1`. We keep all of this. What we replace is the
  **design/component layer** (React Bootstrap → Tailwind + Radix) and the UI architecture.
  The original UI is preserved (see §6) for reference and for the revert bundle.
- **Same connection method as stock GP2040-CE:** the UI is compiled into the firmware and
  served on-device via lwIP/RNDIS at `http://192.168.7.1` (same-origin — this is why a
  separately-hosted app is not viable; the device speaks plain HTTP with no CORS).
- **Deploy = flash `.uf2`. Revert = flash stock `.uf2`.** No special revert mechanism;
  it is the RP2040's native BOOTSEL drag-and-drop flashing.

### Data flow

```
Browser UI (React SPA, served from device)
        │  HTTP GET/SET /api/*  (protobuf-backed, ArduinoJson on device)
        ▼
lwIP HTTP server on RP2040  ──►  GP2040-CE config store
```

- Dev mode: the existing mock Express server stands in for the device so UI work needs no
  hardware. The app talks to `/api/*` in both dev (proxied to mock) and prod (same-origin
  device).

## 3. Tech Stack (bundle-size-disciplined)

**Hard constraint:** the built UI is packed into `fsdata.c` and compiled into firmware; it
must fit in RP2040 flash alongside everything else. The stock app already fits, so the
budget is "do not materially regress." Enforced as a CI size budget.

**Inherited from upstream (keep):**
- **Build/tooling:** Vite + TypeScript (already in place).
- **Framework:** React 18 (already in place).
- **State:** Zustand (already in place).
- **Proto → TS types:** existing `build-proto` (`pbjs` → `src_gen/`) — the config schema
  is already type-generated from the firmware `.proto` files. Reuse, do not reinvent.
- **fsdata packing:** existing `makefsdata.js`.
- **Dev servers:** existing mock Express server + `dev-board` mode (`VITE_DEV_BASE_URL`).

**Replaced / added in Phase 0:**
- **Styling:** **Tailwind CSS**, replacing React Bootstrap.
- **Components:** **Radix** headless primitives, replacing React Bootstrap components.
- **Controller/layout art (Phase 1+, but design system set now):** inline **SVG** (crisp,
  tiny, themeable) — no bitmap assets.
- **Testing:** Vitest + React Testing Library; typed API client mocked in unit tests.

**Deferred decisions (not Phase 0):** whether to migrate forms off Formik+Yup (to e.g.
react-hook-form + zod) and whether to keep i18next. Phase 0 minimizes churn — swap only
the design/component layer; revisit form/i18n libraries in a later phase.

## 4. Phase 0 Deliverable

A **rebuilt-from-scratch UI skeleton** that proves the whole pipeline end-to-end. It is
deliberately **minimal in features** — the goal is the foundation everything hangs off,
not parity with every stock page.

Concretely, Phase 0 ships:

1. **Baseline verified:** the forked repo builds unmodified (`npm run build` →
   `fsdata.c` → firmware `.uf2`) and flashes/connects, establishing a known-good starting
   point before we change the UI.
2. **New design system installed:** Tailwind + Radix added to `www/`, React Bootstrap
   removed from the parts we touch, with a CI bundle-size budget guarding flash fit.
3. A new **app shell** (navigation/layout) built in the new design system, with an
   explicit **connection-state model** — `searching` / `connected` / `lost` — with clear
   messaging for the RNDIS/connectivity quirks users hit today (never a blank page).
4. One **real config round-trip** rebuilt in the new UI: read current config from the
   device (via the existing typed API client / `src_gen` types), edit a value, validate it,
   save it back, and confirm the write persists.
5. Verified build → `fsdata.c` → firmware `.uf2` **with our changes**, flashed to real
   hardware, connecting at `http://192.168.7.1` (documented hardware smoke test).
6. The **revert-to-stock bundle**: matching official stock `.uf2` + a one-page
   "return to the original interface" guide.
7. Documented **dual-PC dev workflow** (clone on both PCs, VS Code, push/pull; documented
   toolchain: Pico SDK + Node; optionally a `.devcontainer`).

### Out of scope for Phase 0 (explicitly deferred)

- Auto controller display, pin-detection wizard, live visualizer (Phase 1).
- Profiles/quick-switch, LED designer, macro editor (Phase 2).
- Any new firmware C++ endpoints or a WebSocket channel (Phase 3 if needed).
- Full feature parity with every stock configurator page. Phase 0 proves the pipeline
  with a minimal surface; remaining pages are ported as later phases need them.

## 5. Error Handling

- Connection-state machine drives the whole UI shell; lost/searching states show
  actionable guidance rather than errors or blank screens.
- Config writes are validated against generated proto types **before** POST; the UI
  confirms successful write-back and surfaces device-side failures clearly.

## 6. Repository Structure & Workflow

- New UI lives in `www/`. The **original stock UI is preserved** (rename to `www-stock/`
  or keep on a dedicated branch/tag) so it is available for reference and the revert
  bundle, and so upstream `www/` changes can still be diffed.
- Existing `www/` → `fsdata.c` build pipeline is reused unchanged.
- `upstream` git remote points at `OpenStickCommunity/GP2040-CE` so firmware/API fixes can
  be pulled in later.
- MIT license and upstream attribution are retained.
- **Dual-PC:** GitHub fork is source of truth; both PCs clone and sync via push/pull.

## 7. Testing Strategy

- **Unit (automated):** Vitest + RTL for components and the typed API client (mocked).
  TDD for client logic.
- **Manual (documented checklist):** the flash-and-connect hardware path, which cannot be
  fully automated — build `.uf2`, flash via BOOTSEL, connect at `192.168.7.1`, read/edit/
  save a config value, confirm persistence, and confirm revert-to-stock works.

## 8. Open Questions / Risks

- **Tailwind + React Bootstrap coexistence during migration.** Ripping out React Bootstrap
  wholesale in Phase 0 would balloon scope (many stock pages depend on it). Mitigation:
  build the new shell + one round-trip page in Tailwind/Radix; leave untouched stock pages
  temporarily present or trimmed, and port them in later phases. Phase 0 does **not**
  require removing React Bootstrap everywhere.
- **Flash size headroom.** Adding Tailwind/Radix alongside (temporarily) existing deps may
  grow the bundle. Measured against the CI budget as the first real gate; if tight, drop
  unused stock deps or evaluate Preact/compat before adding features.
- **Vite build + `makefsdata.js` after our changes** — verify the existing pack step still
  produces a valid `fsdata.c` once Tailwind is in the pipeline (early Phase 0 check).
