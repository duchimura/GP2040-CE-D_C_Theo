import type { ReactNode } from 'react';
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
  const controllerInfo = useConnectionStore((s) => s.controllerInfo);

  // Real firmware has been observed to omit boardArchitecture/boardBuild/
  // boardBuildType entirely (useConnectionStore defaults those to ''), so
  // this is assembled from parts instead of one fixed template — a fixed
  // string would leave stray punctuation behind for whichever fields are
  // missing (e.g. "(, ) · build ·").
  const detailsText = (): string => {
    if (!controllerInfo) return '';
    const parenBits = [
      controllerInfo.boardArchitecture,
      controllerInfo.boardBuildType,
    ].filter(Boolean);
    let base = t('conn-connected-full-details-base', {
      label: controllerInfo.boardConfigLabel,
      version: controllerInfo.version,
    });
    if (parenBits.length > 0) base += ` (${parenBits.join(', ')})`;

    const segments = [base];
    if (controllerInfo.boardBuild) {
      segments.push(
        t('conn-connected-full-details-build', { build: controllerInfo.boardBuild }),
      );
    }
    if (controllerInfo.boardConfigFileName) {
      segments.push(controllerInfo.boardConfigFileName);
    }
    return segments.join(' · ');
  };

  // Everything after the "Connected Controller :" prefix is bold, so this
  // needs JSX rather than one fully-interpolated string.
  const connectedMessage: ReactNode = controllerInfo ? (
    <>
      {t('conn-connected-full-prefix')}{' '}
      <strong>{detailsText()}</strong>
    </>
  ) : controllerName ? (
    t('conn-connected-named', { name: controllerName })
  ) : (
    t('conn-connected')
  );

  const message: ReactNode = {
    searching: t('conn-searching'),
    connected: connectedMessage,
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
