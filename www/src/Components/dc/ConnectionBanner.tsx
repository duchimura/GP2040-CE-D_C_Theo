import { useTranslation } from 'react-i18next';
import {
  useConnectionStore,
  type ConnectionStatus,
} from '../../Store/useConnectionStore';

const STATUS_CLASS: Record<ConnectionStatus, string> = {
  searching: 'tw-bg-slate-700 tw-text-slate-100',
  connected: 'tw-bg-emerald-700 tw-text-white',
  lost: 'tw-bg-amber-700 tw-text-white',
};

export default function ConnectionBanner() {
  const { t } = useTranslation('DC');
  const status = useConnectionStore((s) => s.status);
  const controllerName = useConnectionStore((s) => s.controllerName);

  const message = {
    searching: t('conn-searching'),
    connected: controllerName
      ? t('conn-connected-named', { name: controllerName })
      : t('conn-connected'),
    lost: t('conn-lost'),
  }[status];

  return (
    <div
      data-testid="connection-banner"
      data-status={status}
      role="status"
      className={`tw-w-full tw-mb-4 tw-px-4 tw-py-2 tw-text-sm ${STATUS_CLASS[status]}`}
    >
      {message}
    </div>
  );
}
