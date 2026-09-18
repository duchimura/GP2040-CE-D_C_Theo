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
