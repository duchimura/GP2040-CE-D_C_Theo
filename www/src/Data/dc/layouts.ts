import type { LayoutButtonKey } from './gpioActions';

export type LayoutStyle = 'leverless' | 'arcadeStick';
export type ButtonPlacement = { key: LayoutButtonKey; x: number; y: number; r: number };
export type Layout = { viewBox: string; placements: ButtonPlacement[] };

const R = 30; // action button radius
const RD = 26; // direction radius
const RA = 22; // aux button radius

// Right-hand 8-button cluster + aux, shared by both layouts.
const rightCluster: ButtonPlacement[] = [
  { key: 'S1', x: 345, y: 78, r: RA },
  { key: 'S2', x: 402, y: 78, r: RA },
  { key: 'A1', x: 459, y: 78, r: RA },
  { key: 'A2', x: 516, y: 78, r: RA },
  { key: 'B3', x: 350, y: 170, r: R },
  { key: 'B4', x: 422, y: 158, r: R },
  { key: 'R1', x: 494, y: 160, r: R },
  { key: 'L1', x: 566, y: 176, r: R },
  { key: 'B1', x: 356, y: 248, r: R },
  { key: 'B2', x: 428, y: 236, r: R },
  { key: 'R2', x: 500, y: 238, r: R },
  { key: 'L2', x: 572, y: 254, r: R },
];

const leverlessDirections: ButtonPlacement[] = [
  { key: 'Left', x: 70, y: 200, r: RD },
  { key: 'Down', x: 132, y: 228, r: RD },
  { key: 'Right', x: 194, y: 200, r: RD },
  { key: 'Up', x: 160, y: 300, r: 34 }, // large thumb button
];

const arcadeDirections: ButtonPlacement[] = [
  { key: 'Up', x: 132, y: 150, r: RD },
  { key: 'Down', x: 132, y: 258, r: RD },
  { key: 'Left', x: 70, y: 204, r: RD },
  { key: 'Right', x: 194, y: 204, r: RD },
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
