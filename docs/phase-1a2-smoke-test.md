# Phase 1A.2 Smoke Test — Remap functions on the controller view

## Automated (runs anywhere)

```bash
cd www
npm ci
npm run lint:dc   # our /dc code is rule-clean
npm test          # all suites pass
npm run build
npm run size-check
```

## Dev-server check (no hardware)

```bash
cd www
npm run dev
```

Open <http://localhost:3000/dc/controller>:
1. Click **Remap** — the function list appears on the left, the layout becomes clickable,
   and a Save/Revert bar shows "No changes".
2. Select a function (e.g. **B4**), then click a button (e.g. **B1 / Pin 6**). That button
   shows the new label with an **amber pending outline**, and the bar reads
   "1 pending change(s)" with **Save** enabled.
3. Click **Save** — the bar returns to "No changes" (the mock `setPinMappings` accepts the
   write). Note the mock server does **not** persist, so the button reverts to its original
   label after reload; real hardware persists.
4. Make another edit, click **Revert** — pending changes are discarded.
5. Only **wired** buttons are clickable; unmapped slots do nothing.

## Hardware smoke test (human-run — cannot be automated here)

1. [ ] Open `http://192.168.7.1/dc/controller`, click **Remap**.
2. [ ] Select a function, click a button, **Save**.
3. [ ] Reload the page (or the stock Pin Mapping page) and confirm the new assignment
       **persisted**.
4. [ ] Verify in a gamepad tester / game that the physical button now performs the new
       function.
5. [ ] Confirm **Revert** discards unsaved edits, and that a failed save shows the error
       and keeps your edits.
