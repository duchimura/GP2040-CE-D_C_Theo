import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { INPUT_MODES } from '../../Data/dc/inputModes';
import { saveInputMode } from '../../Hooks/dc/saveInputMode';
import { useConnectionStore } from '../../Store/useConnectionStore';

type Status = 'idle' | 'saving' | 'saved' | 'error';

const STATUS_KEYS: Record<Exclude<Status, 'idle'>, string> = {
  saving: 'input-mode-saving',
  saved: 'input-mode-saved',
  error: 'input-mode-save-failed',
};

// The console/protocol the controller emulates over USB. Saves as soon as a
// mode is picked; the value shown always comes from the device (via the
// connection poll), so it can't drift from what's actually stored.
export default function InputModeSelector() {
  const { t } = useTranslation('DC');
  const inputMode = useConnectionStore((s) => s.inputMode);
  const [status, setStatus] = useState<Status>('idle');
  // What the user has picked while saves are still in flight. Shown straight
  // away so fast keyboard stepping builds on the last pick instead of snapping
  // back to the device value; cleared once the queue drains, at which point the
  // store holds the truth (the new mode, or the old one if a save failed).
  const [picked, setPicked] = useState<number | null>(null);

  // Saves run one at a time, in the order picked: each is a read-modify-write of
  // the whole options block, so overlapping ones could leave the device on an
  // older choice. The select stays enabled meanwhile (a disabled control drops
  // keyboard focus, breaking arrow-key stepping through the modes).
  const queue = useRef<Promise<void>>(Promise.resolve());
  const inFlight = useRef(0);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mode = Number(e.target.value);
    inFlight.current += 1;
    setPicked(mode);
    setStatus('saving');
    queue.current = queue.current.then(async () => {
      let next: Status = 'saved';
      try {
        await saveInputMode(mode);
        useConnectionStore.setState({ inputMode: mode });
      } catch {
        next = 'error';
      }
      inFlight.current -= 1;
      if (inFlight.current === 0) {
        setPicked(null);
        setStatus(next);
      }
    });
  };

  const shown = picked ?? inputMode;

  return (
    <div className="tw-inline-flex tw-items-center tw-gap-2">
      <select
        aria-label={t('input-mode-label')}
        value={shown === null ? '' : String(shown)}
        disabled={inputMode === null}
        onChange={onChange}
        className="tw-rounded tw-border tw-border-slate-300 dark:tw-border-slate-600 tw-bg-white tw-text-slate-800 dark:tw-bg-slate-800 dark:tw-text-slate-100 tw-px-2 tw-py-1 tw-text-sm"
      >
        {inputMode === null && <option value="">…</option>}
        {INPUT_MODES.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <span role="status" className="tw-text-xs tw-text-slate-500 dark:tw-text-slate-400">
        {status === 'idle' ? '' : t(STATUS_KEYS[status])}
      </span>
    </div>
  );
}
