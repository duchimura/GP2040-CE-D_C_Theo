import fs from 'node:fs';
import path from 'node:path';

// Baseline JS after Phase 0 (2026-09-16): 1,401,846 bytes + 15% headroom.
// Raise deliberately, never silently — the UI is deflate-packed into firmware
// flash, so growth here directly costs on-device space.
const MAX_BYTES = 1612123;
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
