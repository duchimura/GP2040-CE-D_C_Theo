import { LAYOUT_STYLES, type LayoutStyle } from '../../Data/dc/layouts';

const LABELS: Record<LayoutStyle, string> = {
  leverless: 'Leverless',
  arcadeStick: 'Arcade Stick',
};

const STORAGE_KEY = 'dc.layoutStyle';

export function readSavedLayoutStyle(): LayoutStyle | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'leverless' || v === 'arcadeStick' ? v : null;
  } catch {
    return null;
  }
}

export function saveLayoutStyle(style: LayoutStyle): void {
  try {
    localStorage.setItem(STORAGE_KEY, style);
  } catch {
    // per-viewer convenience only; ignore failures
  }
}

type Props = { value: LayoutStyle; onChange: (style: LayoutStyle) => void };

export default function LayoutStyleSelector({ value, onChange }: Props) {
  return (
    <div className="tw-inline-flex tw-overflow-hidden tw-rounded tw-border tw-border-slate-600">
      {LAYOUT_STYLES.map((style) => (
        <button
          key={style}
          type="button"
          aria-pressed={value === style}
          onClick={() => onChange(style)}
          className={`tw-px-3 tw-py-1 tw-text-sm ${
            value === style
              ? 'tw-bg-sky-600 tw-text-white'
              : 'tw-bg-transparent tw-text-slate-300'
          }`}
        >
          {LABELS[style]}
        </button>
      ))}
    </div>
  );
}
