# Mode Integration Smoke Test — D_C_Theo persistent mode

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

Open <http://localhost:3000/>:
1. **Default is ON** — `/` lands on the **Controller view** (mapping + System Stats + Remap),
   the connection banner shows, and the **D_C_Theo Version** badge is **blue**.
2. **Configuration ▸ Pin Mapping** opens the **Controller view** (our page), not the stock
   Pin Mapping.
3. Click the **D_C_Theo Version** badge to toggle **OFF** — `/` shows the **stock Home**,
   `/pin-mapping` shows the **stock Pin Mapping**, the connection banner is **hidden**, and
   the badge turns **grey**.
4. **Reload** — the mode **persists** (localStorage `dc.mode`).
5. Toggle back **ON** — enhanced pages + banner return.

## Hardware note (human-run)

On a flashed board at `http://192.168.7.1/`, confirm the same: default lands on the
controller view; the badge flips to the untouched stock interface and back; the choice
persists across reconnects.
