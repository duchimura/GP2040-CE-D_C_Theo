import { useState } from 'react';
import { getLayout, type LayoutStyle, type ButtonPlacement } from '../../Data/dc/layouts';
import type { MappedButton } from '../../Hooks/dc/useControllerMapping';
import type { FaceStyle } from '../../Data/dc/faceButtons';
import { fitFontSize } from '../../Data/dc/fitLabel';
import FaceGlyph from './FaceGlyph';

// Horizontal room a label has inside its circle (diameter minus a margin).
const LABEL_MARGIN = 8;
// The glyph is a fraction of the circle's radius, sitting where the label text
// would (just above center, leaving the "Pin N" line below it).
const GLYPH_SIZE_RATIO = 0.28;
const GLYPH_OFFSET_Y = 8;

type Props = {
  layoutStyle: LayoutStyle;
  mapping: MappedButton[];
  heldPins: number[];
  labelFor: (buttonKey: string) => string;
  onButtonClick?: (buttonKey: string) => void;
  // Dropping a function dragged from FunctionList onto a button slot — an
  // alternative to the select-then-click flow (onButtonClick + the caller's
  // own "selected function" state), not a replacement for it. Gated by the
  // same wired/clickable check as onButtonClick, so anything you can click
  // to remap you can also drag onto.
  onFunctionDrop?: (buttonKey: string, functionKey: string) => void;
  overrideLabel?: (buttonKey: string) => string | undefined;
  // The function key a slot is currently showing when overrideLabel replaces its
  // label (remap mode) — face styling follows the displayed function, not the slot.
  overrideButtonKey?: (buttonKey: string) => string | undefined;
  // Optional per-function styling (PlayStation symbols, Xbox colors); functions
  // it returns nothing for stay plain text. See Data/dc/faceButtons.ts.
  faceStyleFor?: (buttonKey: string) => FaceStyle | undefined;
  pendingKeys?: Set<string>;
  // Dynamically-detected buttons beyond the standard layout (see
  // Data/dc/extraButtons.ts), rendered the same way as static placements.
  extraPlacements?: ButtonPlacement[];
  // Which physical board's pin wiring to use for the fixed 12 slots (see
  // Data/dc/layouts.ts) — omit for the default (Pico) wiring.
  boardConfig?: string;
  // Mirror the fixed-12 shape for a "southpaw"-style board: the cluster and
  // directions swap sides and each flips internally (see layouts.ts's
  // mirrorShape). extraPlacements are computed by the caller and already
  // reflect this (Data/dc/extraButtons.ts) — this only affects the fixed 12.
  mirrored?: boolean;
};

type ButtonColors = {
  fill: string;
  stroke: string;
  label: string;
  pin: string;
};

function colorsFor(mapped: boolean, held: boolean): ButtonColors {
  if (!mapped) {
    // Unassigned: recede into the background.
    return { fill: '#0f172a', stroke: '#334155', label: '#64748b', pin: '#64748b' };
  }
  if (held) {
    // Lit: bright fill with DARK text so it stays readable (no white-on-light wash-out).
    return { fill: '#38bdf8', stroke: '#0ea5e9', label: '#0b1220', pin: '#1e293b' };
  }
  // Assigned, idle: dark fill with light text.
  return { fill: '#334155', stroke: '#64748b', label: '#f1f5f9', pin: '#cbd5e1' };
}

export default function ControllerLayout({
  layoutStyle,
  mapping,
  heldPins,
  labelFor,
  onButtonClick,
  onFunctionDrop,
  overrideLabel,
  overrideButtonKey,
  faceStyleFor,
  pendingKeys,
  extraPlacements = [],
  boardConfig,
  mirrored,
}: Props) {
  const layout = getLayout(layoutStyle, boardConfig, mirrored);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  // Keyed by pin, not by function name: a placement is a fixed physical position
  // tied to its defaultPin, and two pins can legitimately share a function.
  const byPin = new Map(mapping.map((m) => [m.pin, m]));
  const allPlacements = [...layout.placements, ...extraPlacements];

  // Fit the viewBox tightly around the actual buttons (static + extra) instead
  // of the layout's fixed 0,0-origin box — that left a lot of dead space on
  // the left/top (and wouldn't grow for extra-button rows pushing past the
  // bottom), which also meant the rendered SVG couldn't fill its container
  // without stretching that empty margin along with it.
  const PAD = 16;
  const left = Math.min(...allPlacements.map((p) => p.x - p.r)) - PAD;
  const top = Math.min(...allPlacements.map((p) => p.y - p.r)) - PAD;
  const right = Math.max(...allPlacements.map((p) => p.x + p.r)) + PAD;
  const bottom = Math.max(...allPlacements.map((p) => p.y + p.r)) + PAD;
  const viewBox = `${left} ${top} ${right - left} ${bottom - top}`;

  return (
    <svg
      viewBox={viewBox}
      className="tw-w-full"
      role="img"
      aria-label="Controller layout"
    >
      {allPlacements.map((p) => {
        const mapped = byPin.get(p.defaultPin);
        const held = mapped ? heldPins.includes(mapped.pin) : false;
        // Extra buttons are wired (their pin was detected as in use), so they
        // count as assigned/clickable even when their action has no entry in
        // `mapping` (e.g. a MACRO/TURBO action, which
        // loadControllerMapping/profileToMappedButtons drop because it has no
        // fixed layout key).
        const wired = Boolean(mapped) || p.action !== undefined;
        const c = colorsFor(wired, held);
        const clickable = wired && Boolean(onButtonClick);
        const droppable = wired && Boolean(onFunctionDrop);
        const pending = pendingKeys?.has(p.key) ?? false;
        const dragOver = droppable && dragOverKey === p.key;
        // An extra button with no resolvable function (mapped undefined but the
        // pin is wired) reports just its pin number — no made-up label.
        const label =
          overrideLabel?.(p.key) ??
          (mapped ? labelFor(mapped.buttonKey) : p.action !== undefined ? '' : labelFor(p.key));
        // The function this slot is showing: a pending remap override, else its
        // mapped function, else (an unwired standard slot) its own nominal key.
        const styleKey =
          overrideButtonKey?.(p.key) ??
          mapped?.buttonKey ??
          (p.action === undefined ? p.key : undefined);
        const faceStyle = styleKey ? faceStyleFor?.(styleKey) : undefined;
        // Only an idle, assigned button takes the console color; held and
        // unassigned keep their dark/dim label colors for contrast.
        const labelColor = wired && !held && faceStyle ? faceStyle.color : c.label;
        return (
          <g
            key={p.key}
            data-testid={`ctrl-btn-${p.key}`}
            data-held={held ? 'true' : 'false'}
            data-pending={pending ? 'true' : 'false'}
            onClick={clickable ? () => onButtonClick?.(p.key) : undefined}
            style={clickable ? { cursor: 'pointer' } : undefined}
            onDragOver={
              droppable
                ? (e) => {
                    // Required for onDrop to fire at all — browsers default
                    // to rejecting drops on most elements.
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    if (dragOverKey !== p.key) setDragOverKey(p.key);
                  }
                : undefined
            }
            onDragLeave={
              droppable
                ? () => setDragOverKey((k) => (k === p.key ? null : k))
                : undefined
            }
            onDrop={
              droppable
                ? (e) => {
                    e.preventDefault();
                    setDragOverKey(null);
                    const functionKey = e.dataTransfer.getData('text/plain');
                    if (functionKey) onFunctionDrop?.(p.key, functionKey);
                  }
                : undefined
            }
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill={c.fill}
              stroke={dragOver ? '#f59e0b' : pending ? '#f59e0b' : c.stroke}
              strokeWidth={dragOver || pending ? 3 : 2}
            />
            {label && <title>{label}</title>}
            {label && faceStyle?.shape ? (
              <FaceGlyph
                shape={faceStyle.shape}
                cx={p.x}
                cy={p.y - GLYPH_OFFSET_Y}
                size={p.r * GLYPH_SIZE_RATIO}
                color={labelColor}
              />
            ) : (
              label && (
                <text
                  x={p.x}
                  y={p.y - 2}
                  textAnchor="middle"
                  fill={labelColor}
                  style={{
                    fontSize: `${fitFontSize(label, p.r * 2 - LABEL_MARGIN)}px`,
                    fontWeight: 600,
                  }}
                >
                  {label}
                </text>
              )
            )}
            {wired && (
              <text
                x={p.x}
                y={label ? p.y + 12 : p.y + 4}
                textAnchor="middle"
                fill={c.pin}
                style={{ fontSize: '9px' }}
              >
                {`Pin ${mapped?.pin ?? p.defaultPin}`}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
