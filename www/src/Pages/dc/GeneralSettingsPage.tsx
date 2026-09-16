import { useEffect, useState } from 'react';
import {
  loadGeneralSettings,
  saveGeneralSettings,
  type GeneralSettings,
} from '../../Hooks/dc/useGeneralSettings';
import { INPUT_MODES } from '../../Data/dc/inputModes';

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    loadGeneralSettings()
      .then(setSettings)
      .catch(() => setStatus('Load failed'));
  }, []);

  if (!settings) return <div className="tw-p-4">Loading…</div>;

  const onSave = async () => {
    try {
      await saveGeneralSettings(settings);
      setStatus('Saved');
    } catch {
      setStatus('Save failed');
    }
  };

  return (
    <div className="tw-p-4 tw-space-y-4">
      <h1 className="tw-text-lg tw-font-semibold">General Settings</h1>
      <label className="tw-block">
        <span className="tw-mr-2">Input mode</span>
        <span className="tw-block tw-text-xs tw-text-slate-400 tw-mb-1">
          The console/protocol the controller emulates over USB.
        </span>
        <select
          data-testid="input-mode"
          className="tw-border tw-rounded tw-px-2 tw-py-1 tw-text-black"
          value={String(settings.inputMode)}
          onChange={(e) =>
            setSettings({ ...settings, inputMode: Number(e.target.value) })
          }
        >
          {INPUT_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <button
        data-testid="save-settings"
        className="tw-bg-sky-600 tw-text-white tw-rounded tw-px-3 tw-py-1"
        onClick={onSave}
      >
        Save
      </button>
      {status && <div data-testid="save-status">{status}</div>}
    </div>
  );
}
