import type { LayoutButtonKey } from './gpioActions';

export type LayoutStyle = 'leverless' | 'arcadeStick';
// `key` is just the slot's nominal/fallback label. `defaultPin` is what makes this
// slot a fixed physical position: the GPIO pin permanently wired to it, independent
// of whatever function the profile currently assigns that pin. Rendering and click
// handling must resolve through defaultPin, never through the current function name
// — two pins can share a function (or a pin can go unassigned), and a lookup keyed
// by function name silently collapses/loses one of them (see ControllerLayout).
export type ButtonPlacement = {
  key: LayoutButtonKey;
  defaultPin: number;
  x: number;
  y: number;
  r: number;
};
export type Layout = { viewBox: string; placements: ButtonPlacement[] };

const R = 30; // action button radius
const RD = 26; // direction radius
const RA = 22; // aux button radius

// Right-hand 8-button cluster + aux, shared by both layouts.
const rightCluster: ButtonPlacement[] = [
  { key: 'S1', defaultPin: 22, x: 345, y: 78, r: RA },
  { key: 'S2', defaultPin: 23, x: 402, y: 78, r: RA },
  { key: 'A1', defaultPin: 20, x: 459, y: 78, r: RA },
  { key: 'A2', defaultPin: 21, x: 516, y: 78, r: RA },
  { key: 'B3', defaultPin: 10, x: 350, y: 170, r: R },
  { key: 'B4', defaultPin: 11, x: 422, y: 158, r: R },
  { key: 'R1', defaultPin: 12, x: 494, y: 160, r: R },
  { key: 'L1', defaultPin: 13, x: 566, y: 176, r: R },
  { key: 'B1', defaultPin: 6, x: 356, y: 248, r: R },
  { key: 'B2', defaultPin: 7, x: 428, y: 236, r: R },
  { key: 'R2', defaultPin: 8, x: 500, y: 238, r: R },
  { key: 'L2', defaultPin: 9, x: 572, y: 254, r: R },
];

const leverlessDirections: ButtonPlacement[] = [
  { key: 'Left', defaultPin: 5, x: 70, y: 200, r: RD },
  { key: 'Down', defaultPin: 3, x: 132, y: 228, r: RD },
  { key: 'Right', defaultPin: 4, x: 194, y: 200, r: RD },
  { key: 'Up', defaultPin: 2, x: 160, y: 300, r: 34 }, // large thumb button
];

const arcadeDirections: ButtonPlacement[] = [
  { key: 'Up', defaultPin: 2, x: 132, y: 150, r: RD },
  { key: 'Down', defaultPin: 3, x: 132, y: 258, r: RD },
  { key: 'Left', defaultPin: 5, x: 70, y: 204, r: RD },
  { key: 'Right', defaultPin: 4, x: 194, y: 204, r: RD },
];

export const LAYOUTS: Record<LayoutStyle, Layout> = {
  leverless: {
    viewBox: '0 0 640 360',
    placements: [...leverlessDirections, ...rightCluster],
  },
  arcadeStick: {
    viewBox: '0 0 640 360',
    placements: [...arcadeDirections, ...rightCluster],
  },
};

export const LAYOUT_STYLES: LayoutStyle[] = ['leverless', 'arcadeStick'];
