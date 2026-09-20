import type { FaceShape } from '../../Data/dc/faceButtons';

type Props = {
  shape: FaceShape;
  cx: number;
  cy: number;
  // Half the glyph's width/height.
  size: number;
  color: string;
};

const STROKE_WIDTH = 3;

// A PlayStation face-button symbol drawn as an outline centered on (cx, cy).
export default function FaceGlyph({ shape, cx, cy, size, color }: Props) {
  const common = {
    stroke: color,
    strokeWidth: STROKE_WIDTH,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <g data-shape={shape} aria-hidden="true">
      {shape === 'cross' && (
        <>
          <line x1={cx - size} y1={cy - size} x2={cx + size} y2={cy + size} {...common} />
          <line x1={cx + size} y1={cy - size} x2={cx - size} y2={cy + size} {...common} />
        </>
      )}
      {shape === 'circle' && <circle cx={cx} cy={cy} r={size} {...common} />}
      {shape === 'square' && (
        <rect x={cx - size} y={cy - size} width={size * 2} height={size * 2} {...common} />
      )}
      {shape === 'triangle' && (
        <polygon
          points={`${cx},${cy - size} ${cx + size * 1.05},${cy + size * 0.8} ${cx - size * 1.05},${cy + size * 0.8}`}
          {...common}
        />
      )}
    </g>
  );
}
