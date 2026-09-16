import {
  useConnectionStore,
  type ConnectionStatus,
} from '../../Store/useConnectionStore';

const MESSAGES: Record<ConnectionStatus, string> = {
  searching: 'Searching for your controller…',
  connected: 'Controller connected',
  lost: "Can't reach the controller. Plug it in via USB and open http://192.168.7.1",
};

const STATUS_CLASS: Record<ConnectionStatus, string> = {
  searching: 'tw-bg-slate-700 tw-text-slate-100',
  connected: 'tw-bg-emerald-700 tw-text-white',
  lost: 'tw-bg-amber-700 tw-text-white',
};

export default function ConnectionBanner() {
  const status = useConnectionStore((s) => s.status);
  return (
    <div
      data-testid="connection-banner"
      data-status={status}
      role="status"
      className={`tw-w-full tw-mb-4 tw-px-4 tw-py-2 tw-text-sm ${STATUS_CLASS[status]}`}
    >
      {MESSAGES[status]}
    </div>
  );
}
