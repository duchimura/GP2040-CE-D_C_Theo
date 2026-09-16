import type { LayoutButtonKey } from './gpioActions';

export type LayoutStyle = 'leverless' | 'arcadeStick';
export type ButtonPlacement = { key: LayoutButtonKey; x: number; y: number; r: number };
export type Layout = { viewBox: string; placements: ButtonPlacement[] };

const R = 18; // action button radius
const RD = 15; // direction radius

// Right-hand 8-button cluster + aux, shared by both layouts.
const rightCluster: ButtonPlacement[] = [
  { key: 'B3', x: 250, y: 110, r: R },
  { key: 'B4', x: 300, y: 100, r: R },
  { key: 'R1', x: 350, y: 105, r: R },
  { key: 'L1', x: 400, y: 120, r: R },
  { key: 'B1', x: 255, y: 160, r: R },
  { key: 'B2', x: 305, y: 150, r: R },
  { key: 'R2', x: 355, y: 155, r: R },
  { key: 'L2', x: 405, y: 170, r: R },
  { key: 'S1', x: 190, y: 55, r: 12 },
  { key: 'S2', x: 225, y: 55, r: 12 },
  { key: 'A1', x: 260, y: 55, r: 12 },
  { key: 'A2', x: 295, y: 55, r: 12 },
];

const leverlessDirections: ButtonPlacement[] = [
  { key: 'Left', x: 45, y: 150, r: RD },
  { key: 'Down', x: 88, y: 165, r: RD },
  { key: 'Right', x: 131, y: 150, r: RD },
  { key: 'Up', x: 115, y: 210, r: 22 }, // large thumb button
];

const arcadeDirections: ButtonPlacement[] = [
  { key: 'Up', x: 85, y: 105, r: RD },
  { key: 'Down', x: 85, y: 185, r: RD },
  { key: 'Left', x: 45, y: 145, r: RD },
  { key: 'Right', x: 125, y: 145, r: RD },
];

export const LAYOUTS: Record<LayoutStyle, Layout> = {
  leverless: {
    viewBox: '0 0 460 250',
    placements: [...leverlessDirections, ...rightCluster],
  },
  arcadeStick: {
    viewBox: '0 0 460 250',
    placements: [...arcadeDirections, ...rightCluster],
  },
};

export const LAYOUT_STYLES: LayoutStyle[] = ['leverless', 'arcadeStick'];
