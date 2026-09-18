import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const KEY_MAP = {
  UP: 'Up', DOWN: 'Down', LEFT: 'Left', RIGHT: 'Right',
  B1: 'B1', B2: 'B2', B3: 'B3', B4: 'B4',
  L1: 'L1', L2: 'L2', R1: 'R1', R2: 'R2',
};

const WIRING_LINE_RE =
  /^\s*#define\s+GPIO_PIN_(\d+)\s+GpioAction::BUTTON_PRESS_(UP|DOWN|LEFT|RIGHT|B[1-4]|L[12]|R[12])\b/;

// Parses one board's BoardConfig.h contents into the fixed-12-slot wiring
// (which physical GPIO pin drives each of Up/Down/Left/Right/B1-4/L1/L2/R1/R2),
// or null if this board doesn't define all 4 D-pad directions (not a
// conventional gamepad layout — e.g. a template stub or an accessory board).
// Where a function is wired to more than one pin (a labeled secondary/
// accessibility input, seen on 10 real boards at design time), the first pin
// listed in the file wins — verified against every such case in configs/.
export function extractBoardWiring(contents) {
  const found = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(WIRING_LINE_RE);
    if (!match) continue;
    const key = KEY_MAP[match[2]];
    if (!(key in found)) {
      found[key] = Number(match[1]);
    }
  }
  const hasAllDirections = ['Up', 'Down', 'Left', 'Right'].every((k) => k in found);
  return hasAllDirections ? found : null;
}

// Scans every configs/<Board>/BoardConfig.h and returns
// { [lowercased board folder name]: wiring }, skipping any board
// extractBoardWiring rejects (see that function's doc comment).
export function generateBoardWirings(configsDir) {
  const wirings = {};
  for (const entry of fs.readdirSync(configsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const boardConfigPath = path.join(configsDir, entry.name, 'BoardConfig.h');
    if (!fs.existsSync(boardConfigPath)) continue;
    const wiring = extractBoardWiring(fs.readFileSync(boardConfigPath, 'utf8'));
    if (wiring) {
      wirings[entry.name.toLowerCase()] = wiring;
    }
  }
  return wirings;
}

const KEY_ORDER = [
  'Up', 'Down', 'Left', 'Right',
  'B1', 'B2', 'B3', 'B4', 'L1', 'L2', 'R1', 'R2',
];

// Renders the wirings map as a TypeScript source file.
export function renderTsFile(wirings) {
  const boardEntries = Object.keys(wirings)
    .sort()
    .map((board) => {
      const wiring = wirings[board];
      const fields = KEY_ORDER.filter((k) => k in wiring)
        .map((k) => `${k}: ${wiring[k]}`)
        .join(', ');
      return `  ${JSON.stringify(board)}: { ${fields} },`;
    })
    .join('\n');

  return `// GENERATED FILE — do not hand-edit.
// Produced by \`npm run gen-board-wirings\` (www/scripts/genBoardWirings.js)
// from ../configs/*/BoardConfig.h. Re-run that script — or \`npm start\`/
// \`npm run build\`, which already do — after configs/ changes.

export const GENERATED_BOARD_WIRINGS: Record<string, Record<string, number>> = {
${boardEntries}
};
`;
}

function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const configsDir = path.resolve(__dirname, '../../configs');
  const outPath = path.resolve(__dirname, '../src_gen/boardWirings.ts');

  const wirings = generateBoardWirings(configsDir);
  fs.writeFileSync(outPath, renderTsFile(wirings));
  console.log(
    `gen-board-wirings: wrote ${Object.keys(wirings).length} board wirings to ${outPath}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
