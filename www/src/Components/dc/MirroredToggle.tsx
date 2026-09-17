import { useTranslation } from 'react-i18next';

type Props = { value: boolean; onChange: (mirrored: boolean) => void };

export default function MirroredToggle({ value, onChange }: Props) {
  const { t } = useTranslation('DC');
  return (
    <button
      type="button"
      data-testid="mirrored-toggle"
      aria-pressed={value}
      onClick={() => onChange(!value)}
      className={`tw-rounded tw-border tw-border-slate-300 dark:tw-border-slate-600 tw-px-3 tw-py-1 tw-text-sm ${
        value
          ? 'tw-bg-sky-600 tw-text-white'
          : 'tw-bg-transparent tw-text-slate-600 dark:tw-text-slate-300'
      }`}
    >
      {t('layout-mirrored')}
    </button>
  );
}
