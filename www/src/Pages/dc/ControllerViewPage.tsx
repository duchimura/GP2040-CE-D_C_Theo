import { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../../Contexts/AppContext';
import { BUTTONS } from '../../Data/Buttons';
import { useHeldPinsMonitor } from '../../Hooks/dc/useHeldPinsMonitor';
import { useProfilesView } from '../../Hooks/dc/useProfilesView';
import ControllerLayout from '../../Components/dc/ControllerLayout';
import SystemStatsPanel from '../../Components/dc/SystemStatsPanel';
import FunctionList from '../../Components/dc/FunctionList';
import RemapBar from '../../Components/dc/RemapBar';
import ProfilesBar from '../../Components/dc/ProfilesBar';
import LayoutStyleSelector from '../../Components/dc/LayoutStyleSelector';
import {
  readSavedLayoutStyle,
  saveLayoutStyle,
} from '../../Components/dc/layoutStylePreference';
import type { LayoutStyle } from '../../Data/dc/layouts';
import {
  actionForButtonKey,
  buttonKeyForAction,
  type LayoutButtonKey,
} from '../../Data/dc/gpioActions';

export default function ControllerViewPage() {
  const { t } = useTranslation('DC');
  const view = useProfilesView();
  const [style, setStyle] = useState<LayoutStyle>(
    readSavedLayoutStyle() ?? 'leverless',
  );
  const [remapMode, setRemapMode] = useState(false);
  const [selectedFn, setSelectedFn] = useState<LayoutButtonKey | null>(null);
  const [saving, setSaving] = useState(false);

  // Pause identify polling while remapping so clicks/highlights stay unambiguous.
  const heldPins = useHeldPinsMonitor(!remapMode);

  const appContext = useContext(AppContext) as {
    buttonLabels?: { buttonLabelType?: string };
  };
  const labelSetKey = appContext?.buttonLabels?.buttonLabelType ?? 'gp2040';
  const labelSet =
    (BUTTONS as Record<string, Record<string, string>>)[labelSetKey] ??
    (BUTTONS as Record<string, Record<string, string>>).gp2040;
  const labelFor = (key: LayoutButtonKey): string => labelSet[key] ?? key;

  useEffect(() => {
    view.load();
  }, []);

  const onStyleChange = (s: LayoutStyle) => {
    setStyle(s);
    saveLayoutStyle(s);
  };

  // In remap mode we render the snapshot mapping (stable positions) and override
  // labels/pending from the current (edited) profile — no reflow mid-edit.
  const pinByKey = useMemo(
    () => new Map(view.snapshotMapping.map((m) => [m.buttonKey, m.pin])),
    [view.snapshotMapping],
  );

  const overrideLabel = (key: LayoutButtonKey): string | undefined => {
    if (!remapMode) return undefined;
    const pin = pinByKey.get(key);
    if (pin === undefined) return undefined;
    const workingKey = buttonKeyForAction(view.currentActions[pin]);
    return labelFor(workingKey ?? key);
  };

  const pendingKeySet = new Set<LayoutButtonKey>(
    view.snapshotMapping
      .filter((m) => view.currentActions[m.pin] !== view.snapshotActions[m.pin])
      .map((m) => m.buttonKey),
  );

  const onButtonClick = (key: LayoutButtonKey) => {
    if (!selectedFn) return;
    const pin = pinByKey.get(key);
    if (pin === undefined) return;
    view.assignFunctionToPin(pin, actionForButtonKey(selectedFn));
  };

  const onSave = () => {
    setSaving(true);
    view.save().finally(() => setSaving(false));
  };

  if (view.profiles.length === 0) {
    return (
      <div data-testid="ctrl-waiting" className="tw-p-4">
        {t('waiting-for-controller')}
      </div>
    );
  }

  return (
    <div className="tw-p-4 tw-space-y-4">
      <div className="tw-flex tw-items-center tw-justify-between">
        <h1 className="tw-text-lg tw-font-semibold">{t('controller-header')}</h1>
        <div className="tw-flex tw-items-center tw-gap-2">
          <LayoutStyleSelector value={style} onChange={onStyleChange} />
          <button
            type="button"
            data-testid="remap-toggle"
            onClick={remapMode ? () => setRemapMode(false) : () => setRemapMode(true)}
            className={`tw-rounded tw-px-3 tw-py-1 tw-text-sm ${
              remapMode
                ? 'tw-bg-slate-700 tw-text-slate-200'
                : 'tw-bg-sky-600 tw-text-white'
            }`}
          >
            {remapMode ? t('remap-exit') : t('remap')}
          </button>
        </div>
      </div>

      <ProfilesBar
        profiles={view.profiles}
        selectedIndex={view.selectedIndex}
        maxProfiles={view.maxProfiles}
        onSelect={view.setSelectedIndex}
        onRename={view.rename}
        onAdd={view.addProfile}
        onToggleEnabled={view.toggleEnabled}
        onCopyFromBase={view.copyFromBase}
      />

      {remapMode ? (
        <div className="tw-space-y-3">
          <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
            <span className="tw-text-sm tw-text-slate-400">
              {t('remap-select-hint')}
            </span>
            <RemapBar
              dirty={view.dirty}
              pendingCount={pendingKeySet.size}
              saving={saving}
              error={view.error}
              onSave={onSave}
              onRevert={view.revert}
            />
          </div>
          <div className="tw-flex tw-gap-4">
            <FunctionList
              selected={selectedFn}
              onSelect={setSelectedFn}
              labelFor={labelFor}
            />
            <div className="tw-flex-1">
              <ControllerLayout
                layoutStyle={style}
                mapping={view.snapshotMapping}
                heldPins={[]}
                labelFor={labelFor}
                onButtonClick={onButtonClick}
                overrideLabel={overrideLabel}
                pendingKeys={pendingKeySet}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="tw-text-sm tw-text-slate-400">
            {t('controller-description')}
          </p>
          <div className="tw-flex tw-flex-col tw-gap-4 lg:tw-flex-row lg:tw-items-start">
            <div className="tw-flex-1">
              <ControllerLayout
                layoutStyle={style}
                mapping={view.currentMapping}
                heldPins={heldPins}
                labelFor={labelFor}
              />
            </div>
            <SystemStatsPanel />
          </div>
        </>
      )}
    </div>
  );
}
