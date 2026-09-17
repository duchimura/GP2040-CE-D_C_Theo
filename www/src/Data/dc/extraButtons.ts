import { getLayout, type LayoutStyle, type ButtonPlacement } from './layouts';

// Rows of extra buttons sit below the 8-button cluster (see layouts.ts),
// each row horizontally centered under it. ControllerLayout's viewBox
// auto-fits around whatever these produce, so spacing here just needs to
// look good, not fit inside a fixed canvas size.
const CLUSTER_KEYS = new Set(['B1', 'B2', 'B3', 'B4', 'L1', 'L2', 'R1', 'R2']);
const START_Y = 320;
const SPACING_X = 50;
const SPACING_Y = 52;
const PER_ROW = 6;
const RADIUS = 20;

// A pin counts as "extra" if it's wired to a real button press (positive
// GpioAction) and isn't one of the style's fixed 12 placements. NONE (-10) and
// ASSIGNED_TO_ADDON (0) are excluded by the `action > 0` check.
export function computeExtraPlacements(
  style: LayoutStyle,
  currentActions: Record<number, number>,
  boardConfig?: string,
  mirrored?: boolean,
): ButtonPlacement[] {
  const layout = getLayout(style, boardConfig, mirrored);
  const standardPins = new Set(layout.placements.map((p) => p.defaultPin));

  // Mirroring moves the cluster (see layouts.ts's mirrorShape) — re-center
  // under wherever it now is. The extra buttons themselves are only ever
  // translated as a block, never reordered/flipped: "moved, not mirrored".
  const clusterSlots = layout.placements.filter((p) => CLUSTER_KEYS.has(p.key));
  const clusterCenterX =
    (Math.min(...clusterSlots.map((p) => p.x - p.r)) +
      Math.max(...clusterSlots.map((p) => p.x + p.r))) /
    2;

  const extraPins = Object.entries(currentActions)
    .map(([pin, action]) => ({ pin: Number(pin), action }))
    .filter(({ pin, action }) => action > 0 && !standardPins.has(pin))
    .sort((a, b) => a.pin - b.pin);

  return extraPins.map(({ pin, action }, i) => {
    const row = Math.floor(i / PER_ROW);
    const col = i % PER_ROW;
    // Each row is centered on its own — a shorter final row centers under the
    // cluster too, rather than sitting flush left.
    const itemsInThisRow = Math.min(PER_ROW, extraPins.length - row * PER_ROW);
    const rowStartX = clusterCenterX - ((itemsInThisRow - 1) * SPACING_X) / 2;
    return {
      key: `extra-${pin}`,
      defaultPin: pin,
      action,
      x: rowStartX + col * SPACING_X,
      y: START_Y + row * SPACING_Y,
      r: RADIUS,
    };
  });
}
