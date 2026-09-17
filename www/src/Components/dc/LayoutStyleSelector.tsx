import { useTranslation } from 'react-i18next';
import { LAYOUT_STYLES, type LayoutStyle } from '../../Data/dc/layouts';

const LABEL_KEYS: Record<LayoutStyle, string> = {
  leverless: 'layout-leverless',
  arcadeStick: 'layout-arcade',
};

type Props = { value: LayoutStyle; onChange: (style: LayoutStyle) => void };

export default function LayoutStyleSelector({ value, onChange }: Props) {
  const { t } = useTranslation('DC');
  return (
    <div className="tw-inline-flex tw-overflow-hidden tw-rounded tw-border tw-border-slate-300 dark:tw-border-slate-600">
      {LAYOUT_STYLES.map((style) => (
        <button
          key={style}
          type="button"
          aria-pressed={value === style}
          onClick={() => onChange(style)}
          className={`tw-px-3 tw-py-1 tw-text-sm ${
            value === style
              ? 'tw-bg-sky-600 tw-text-white'
              : 'tw-bg-transparent tw-text-slate-600 dark:tw-text-slate-300'
          }`}
        >
          {t(LABEL_KEYS[style])}
        </button>
      ))}
    </div>
  );
}
