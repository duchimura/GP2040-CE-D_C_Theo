import { LAYOUTS, type LayoutStyle } from '../../Data/dc/layouts';
import type { LayoutButtonKey } from '../../Data/dc/gpioActions';
import type { MappedButton } from '../../Hooks/dc/useControllerMapping';

type Props = {
  layoutStyle: LayoutStyle;
  mapping: MappedButton[];
  heldPins: number[];
  labelFor: (buttonKey: LayoutButtonKey) => string;
};

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
      className="tw-w-full tw-max-w-2xl"
      role="img"
      aria-label="Controller layout"
    >
      {layout.placements.map((p) => {
        const mapped = byKey.get(p.key);
        const held = mapped ? heldPins.includes(mapped.pin) : false;
        const fill = mapped ? (held ? '#38bdf8' : '#1e293b') : '#0f172a';
        const stroke = mapped ? (held ? '#7dd3fc' : '#475569') : '#334155';
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
              fill={fill}
              stroke={stroke}
              strokeWidth={2}
            />
            <text
              x={p.x}
              y={p.y - 2}
              textAnchor="middle"
              fontSize="9"
              fill="#e2e8f0"
            >
              {labelFor(p.key)}
            </text>
            {mapped && (
              <text
                x={p.x}
                y={p.y + 9}
                textAnchor="middle"
                fontSize="8"
                fill="#94a3b8"
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
