# Profiles Smoke Test — profiles in the D_C_Theo controller view

## Automated (runs anywhere)

```bash
cd www
npm ci
npm run lint:dc
npm test
npm run build
npm run size-check
```

## Dev-server check (no hardware)

```bash
cd www
npm run dev
```

Open <http://localhost:3000/> (D_C_Theo ON):
1. A **Profiles** bar shows: profile selector (Profile 1…N), rename field, **Add profile**,
   **Copy from base**, **Enabled** checkbox.
2. **Switch profiles** — the selector highlights the chosen profile; rename, Copy-from-base
   and Enabled reflect it (Copy-from-base / Enabled are disabled for the base profile).
3. **Remap** → select a function → click a button → **Save**. The edit is written to the
   selected profile.
4. **Add / rename / enable-disable** a profile, then **Save**.

## Cross-interface sharing (the point of this feature)

1. In **D_C_Theo mode**, edit Profile 2 (remap a button, rename it) and **Save**.
2. Toggle the **D_C_Theo Version** badge **OFF** → open **Configuration ▸ Pin Mapping**
   (stock). Confirm the **same Profile 2 change** appears there.
3. Do the reverse: edit a profile in the stock Pin Mapping page, Save, toggle D_C_Theo ON,
   and confirm our controller view shows it. (Both use `useProfilesStore` →
   `setPinMappings` + `setProfileOptions`, the same device endpoints.)

## Hardware note (human-run)

On a flashed board, confirm a profile edited/saved in one interface persists and is visible
in the other, and that the device's active-profile switching (buttons / gamepad options)
still selects among these shared profiles.
