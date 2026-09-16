import { LAYOUTS, type LayoutStyle } from '../../Data/dc/layouts';
import type { LayoutButtonKey } from '../../Data/dc/gpioActions';
import type { MappedButton } from '../../Hooks/dc/useControllerMapping';

type Props = {
  layoutStyle: LayoutStyle;
  mapping: MappedButton[];
  heldPins: number[];
  labelFor: (buttonKey: LayoutButtonKey) => string;
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
}: Props) {
  const layout = LAYOUTS[layoutStyle];
  const byKey = new Map(mapping.map((m) => [m.buttonKey, m]));

  return (
    <svg
      viewBox={layout.viewBox}
      className="tw-w-full tw-max-w-4xl"
      role="img"
      aria-label="Controller layout"
    >
      {layout.placements.map((p) => {
        const mapped = byKey.get(p.key);
        const held = mapped ? heldPins.includes(mapped.pin) : false;
        const c = colorsFor(Boolean(mapped), held);
        return (
          <g
            key={p.key}
            data-testid={`ctrl-btn-${p.key}`}
            data-held={held ? 'true' : 'false'}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill={c.fill}
              stroke={c.stroke}
              strokeWidth={2}
            />
            <text
              x={p.x}
              y={p.y - 2}
              textAnchor="middle"
              fill={c.label}
              style={{ fontSize: '13px', fontWeight: 600 }}
            >
              {labelFor(p.key)}
            </text>
            {mapped && (
              <text
                x={p.x}
                y={p.y + 11}
                textAnchor="middle"
                fill={c.pin}
                style={{ fontSize: '7px' }}
              >
                {`P${mapped.pin}`}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
