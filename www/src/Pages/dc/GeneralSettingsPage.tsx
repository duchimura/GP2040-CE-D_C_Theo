import { useEffect, useState } from 'react';
import {
  loadGeneralSettings,
  saveGeneralSettings,
  type GeneralSettings,
} from '../../Hooks/dc/useGeneralSettings';

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
        <input
          data-testid="input-mode"
          type="number"
          className="tw-border tw-rounded tw-px-2 tw-py-1 tw-text-black"
          value={settings.inputMode}
          onChange={(e) =>
            setSettings({ ...settings, inputMode: Number(e.target.value) })
          }
        />
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
