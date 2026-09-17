export type LayoutStyle = 'leverless' | 'arcadeStick';
// `key` is just the slot's nominal/fallback label — a fixed LayoutButtonKey for
// the standard placements below, or a synthetic per-pin id (e.g. `extra-16`) for
// dynamically-detected extra buttons (see Data/dc/extraButtons.ts), so this is
// typed as `string` rather than the closed LayoutButtonKey union.
// `defaultPin` is what makes this slot a fixed physical position: the GPIO pin
// permanently wired to it, independent of whatever function the profile currently
// assigns that pin. Rendering and click handling must resolve through defaultPin,
// never through the current function name — two pins can share a function (or a
// pin can go unassigned), and a lookup keyed by function name silently
// collapses/loses one of them (see ControllerLayout).
export type ButtonPlacement = {
  key: string;
  defaultPin: number;
  x: number;
  y: number;
  r: number;
  // Only set for dynamically-detected extra buttons: the action currently
  // assigned to this pin, for labeling when it has no fixed layout key.
  action?: number;
};
export type Layout = { placements: ButtonPlacement[] };

// A slot's on-screen shape (position/size) is independent of which physical
// board this is — every board still draws as "leverless" or "arcade stick".
// What differs per board is the wiring: which GPIO pin lands in which named
// slot. Keeping these separate means adding a board is one small pin table,
// not a duplicated full layout.
type ShapeSlot = { key: string; x: number; y: number; r: number };

const R = 30; // action button radius

// Right-hand 8-button cluster, shared by both layouts. Any additional wired
// buttons beyond these + the 4 directions are detected at render time — see
// Data/dc/extraButtons.ts — and rendered in rows below this cluster, centered
// under it (exported so extraButtons.ts can align to the same bounds).
export const rightCluster: ShapeSlot[] = [
  { key: 'B3', x: 350, y: 170, r: R },
  { key: 'B4', x: 422, y: 158, r: R },
  { key: 'R1', x: 494, y: 160, r: R },
  { key: 'L1', x: 566, y: 176, r: R },
  { key: 'B1', x: 356, y: 248, r: R },
  { key: 'B2', x: 428, y: 236, r: R },
  { key: 'R2', x: 500, y: 238, r: R },
  { key: 'L2', x: 572, y: 254, r: R },
];

// A genuine curving arc (each consecutive segment's slope increases, unlike a
// straight diagonal) sweeping from near-horizontal at the top to near-vertical
// at the bottom, all 4 buttons on the curve — Up included, not a separate
// thumb button off on its own. Close to the button cluster's left edge (x=320).
const leverlessDirections: ShapeSlot[] = [
  { key: 'Left', x: 150, y: 135, r: 26 },
  { key: 'Down', x: 210, y: 160, r: 26 },
  { key: 'Right', x: 262, y: 200, r: 26 },
  { key: 'Up', x: 282, y: 268, r: 32 }, // moved down to match edge-to-edge spacing (Up has a larger radius)
];

const RD = 26; // direction radius (arcadeStick's traditional +-shaped cluster)
const arcadeDirections: ShapeSlot[] = [
  { key: 'Up', x: 132, y: 150, r: RD },
  { key: 'Down', x: 132, y: 258, r: RD },
  { key: 'Left', x: 70, y: 204, r: RD },
  { key: 'Right', x: 194, y: 204, r: RD },
];

const SHAPES: Record<LayoutStyle, ShapeSlot[]> = {
  leverless: [...leverlessDirections, ...rightCluster],
  arcadeStick: [...arcadeDirections, ...rightCluster],
};

// Full horizontal reflection of the whole fixed-12 shape (directions +
// cluster) as one unit, about their own combined bounding box — not a
// separate "flip just the cluster" step. That single reflection both swaps
// which side each group sits on (directions end up where the cluster was,
// and vice versa) and reverses each group's own internal left-right
// arrangement, matching a physically mirrored ("southpaw") board. Extra/
// optional buttons are NOT part of this — see Data/dc/extraButtons.ts,
// which only re-centers their block under the cluster's new position
// without reordering them.
function mirrorShape(slots: ShapeSlot[]): ShapeSlot[] {
  const min = Math.min(...slots.map((s) => s.x - s.r));
  const max = Math.max(...slots.map((s) => s.x + s.r));
  const axis = min + max; // reflect: x' = axis - x (axis = 2 * center)
  return slots.map((s) => ({ ...s, x: axis - s.x }));
}

const MIRRORED_SHAPES: Record<LayoutStyle, ShapeSlot[]> = {
  leverless: mirrorShape(SHAPES.leverless),
  arcadeStick: mirrorShape(SHAPES.arcadeStick),
};

export const LAYOUT_STYLES: LayoutStyle[] = ['leverless', 'arcadeStick'];

// Per-board wiring for the fixed 12 slots above only (the 8-button cluster +
// 4 directions). Everything else a board wires — S1/S2/L3/R3/A1/A2, turbo,
// SOCD/DP-mode pins, twin-stick buttons, etc. — is already board-agnostic:
// Data/dc/extraButtons.ts detects those dynamically from the profile's
// actual pin assignments at render time, so they need no table entry here.
//
// Always sourced from that board's own configs/<Board>/BoardConfig.h — never
// guessed. Add an entry keyed by the exact string the firmware reports as
// `boardConfig` in getFirmwareVersion (matched case-insensitively below)
// whenever a new board's fixed-12 wiring differs from the Pico default.
type BoardWiring = Record<string, number>;

// configs/Pico/BoardConfig.h — the fallback for any board not listed below
// (including this project's own dev/test board, "picoPET", which uses this
// same wiring).
const PICO_WIRING: BoardWiring = {
  Up: 2, Down: 3, Right: 4, Left: 5,
  B1: 6, B2: 7, R2: 8, L2: 9,
  B3: 10, B4: 11, R1: 12, L1: 13,
};

// configs/MiSTercadeV2/BoardConfig.h
const MISTERCADE_V2_WIRING: BoardWiring = {
  Up: 2, Down: 3, Right: 4, Left: 5,
  B2: 6, R2: 7, L1: 8, L2: 9,
  B3: 10, B4: 11, R1: 12, B1: 13,
};

// configs/OpenCore0/BoardConfig.h
const OPENCORE0_WIRING: BoardWiring = {
  Up: 12, Down: 10, Right: 11, Left: 9,
  B1: 13, B2: 14, R2: 15, L2: 16,
  B3: 17, B4: 18, R1: 19, L1: 20,
};

const BOARD_WIRINGS: Record<string, BoardWiring> = {
  pico: PICO_WIRING,
  mistercadev2: MISTERCADE_V2_WIRING,
  opencore0: OPENCORE0_WIRING,
};

export function getLayout(
  style: LayoutStyle,
  boardConfig?: string,
  mirrored = false,
): Layout {
  const wiring = BOARD_WIRINGS[(boardConfig ?? '').toLowerCase()] ?? PICO_WIRING;
  const shape = mirrored ? MIRRORED_SHAPES[style] : SHAPES[style];
  const placements = shape.map((slot) => ({
    ...slot,
    defaultPin: wiring[slot.key] ?? -1,
  }));
  return { placements };
}
