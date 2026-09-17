import { LAYOUTS, type LayoutStyle } from '../../Data/dc/layouts';
import type { LayoutButtonKey } from '../../Data/dc/gpioActions';
import type { MappedButton } from '../../Hooks/dc/useControllerMapping';

type Props = {
  layoutStyle: LayoutStyle;
  mapping: MappedButton[];
  heldPins: number[];
  labelFor: (buttonKey: LayoutButtonKey) => string;
  onButtonClick?: (buttonKey: LayoutButtonKey) => void;
  overrideLabel?: (buttonKey: LayoutButtonKey) => string | undefined;
  pendingKeys?: Set<LayoutButtonKey>;
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
  overrideLabel,
  pendingKeys,
}: Props) {
  const layout = LAYOUTS[layoutStyle];
  // Keyed by pin, not by function name: a placement is a fixed physical position
  // tied to its defaultPin, and two pins can legitimately share a function.
  const byPin = new Map(mapping.map((m) => [m.pin, m]));

  return (
    <svg
      viewBox={layout.viewBox}
      className="tw-w-full tw-max-w-4xl"
      role="img"
      aria-label="Controller layout"
    >
      {layout.placements.map((p) => {
        const mapped = byPin.get(p.defaultPin);
        const held = mapped ? heldPins.includes(mapped.pin) : false;
        const c = colorsFor(Boolean(mapped), held);
        const clickable = Boolean(mapped) && Boolean(onButtonClick);
        const pending = pendingKeys?.has(p.key) ?? false;
        const label =
          overrideLabel?.(p.key) ?? labelFor(mapped?.buttonKey ?? p.key);
        return (
          <g
            key={p.key}
            data-testid={`ctrl-btn-${p.key}`}
            data-held={held ? 'true' : 'false'}
            data-pending={pending ? 'true' : 'false'}
            onClick={clickable ? () => onButtonClick?.(p.key) : undefined}
            style={clickable ? { cursor: 'pointer' } : undefined}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill={c.fill}
              stroke={pending ? '#f59e0b' : c.stroke}
              strokeWidth={pending ? 3 : 2}
            />
            <text
              x={p.x}
              y={p.y - 2}
              textAnchor="middle"
              fill={c.label}
              style={{ fontSize: '13px', fontWeight: 600 }}
            >
              {label}
            </text>
            {mapped && (
              <text
                x={p.x}
                y={p.y + 12}
                textAnchor="middle"
                fill={c.pin}
                style={{ fontSize: '9px' }}
              >
                {`Pin ${mapped.pin}`}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
