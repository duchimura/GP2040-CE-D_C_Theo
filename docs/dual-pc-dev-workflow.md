# Dual-PC Development Workflow

This project is developed across two PCs using VS Code. GitHub is the source of
truth; each PC clones the fork and syncs with `git pull` / `git push`.

## One-time setup on each PC

1. **Clone the fork:**
   ```bash
   git clone https://github.com/duchimura/GP2040-CE-D_C_Theo.git
   cd GP2040-CE-D_C_Theo
   ```
2. **Open in VS Code** (`code .`).
3. **Install UI dependencies:**
   ```bash
   cd www
   npm ci
   ```
4. (Optional) **Firmware toolchain** for producing `.uf2` builds: install the
   Raspberry Pi Pico SDK and follow the upstream build docs in
   `docs/` / the GP2040-CE wiki. Not needed for UI-only work.

## Day-to-day UI development (no hardware required)

- **Mock server + hot reload:**
  ```bash
  cd www
  npm run dev
  ```
  Opens the app on <http://localhost:3000>; the new surfaces live under
  `/dc/*` (e.g. <http://localhost:3000/dc/settings>). API calls hit the local
  mock Express server.

- **Against a real device** (controller in web-config mode at 192.168.7.1):
  ```bash
  cd www
  npm run dev-board
  ```

- **Tests:** `npm test` (Vitest). **Build:** `npm run build`. **Size gate:**
  `npm run size-check`.

## Syncing between PCs

- Work on the `phase-0-foundation` branch (or a feature branch).
- Before starting on a PC: `git pull`.
- After finishing a chunk: `git add … && git commit && git push`.
- On the other PC: `git pull` to pick up the changes.

## Pulling upstream GP2040-CE fixes

The upstream firmware/API repo is configured as the `upstream` remote:
```bash
git fetch upstream
git merge upstream/main        # or rebase, per preference
```
Resolve conflicts (most will be in `www/` where the UI diverges), then re-run
`npm ci && npm test && npm run build`.
