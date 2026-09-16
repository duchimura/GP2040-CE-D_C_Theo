import { useTranslation } from 'react-i18next';

type Props = {
  dirty: boolean;
  pendingCount: number;
  saving: boolean;
  error: boolean;
  onSave: () => void;
  onRevert: () => void;
};

export default function RemapBar({
  dirty,
  pendingCount,
  saving,
  error,
  onSave,
  onRevert,
}: Props) {
  const { t } = useTranslation('DC');
  return (
    <div className="tw-flex tw-items-center tw-gap-3">
      <span data-testid="remap-pending" className="tw-text-sm tw-text-slate-300">
        {dirty
          ? t('remap-pending', { count: pendingCount })
          : t('remap-none-pending')}
      </span>
      <button
        type="button"
        data-testid="remap-save"
        disabled={!dirty || saving}
        onClick={onSave}
        className="tw-rounded tw-bg-sky-600 tw-px-3 tw-py-1 tw-text-sm tw-text-white disabled:tw-opacity-40"
      >
        {saving ? t('remap-saving') : t('remap-save')}
      </button>
      <button
        type="button"
        data-testid="remap-revert"
        disabled={!dirty || saving}
        onClick={onRevert}
        className="tw-rounded tw-border tw-border-slate-500 tw-px-3 tw-py-1 tw-text-sm tw-text-slate-200 disabled:tw-opacity-40"
      >
        {t('remap-revert')}
      </button>
      {error && (
        <span data-testid="remap-error" className="tw-text-sm tw-text-amber-400">
          {t('remap-error')}
        </span>
      )}
    </div>
  );
}
