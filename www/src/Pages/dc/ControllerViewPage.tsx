import { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../../Contexts/AppContext';
import { BUTTONS } from '../../Data/Buttons';
import {
  loadControllerMapping,
  type MappedButton,
} from '../../Hooks/dc/useControllerMapping';
import { useHeldPinsMonitor } from '../../Hooks/dc/useHeldPinsMonitor';
import {
  initRemapState,
  assignFunction,
  pendingPins,
  type RemapState,
} from '../../Hooks/dc/useRemapState';
import { saveRemap } from '../../Hooks/dc/applyMappingChanges';
import ControllerLayout from '../../Components/dc/ControllerLayout';
import SystemStatsPanel from '../../Components/dc/SystemStatsPanel';
import FunctionList from '../../Components/dc/FunctionList';
import RemapBar from '../../Components/dc/RemapBar';
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
  const [mapping, setMapping] = useState<MappedButton[] | null>(null);
  const [style, setStyle] = useState<LayoutStyle>(
    readSavedLayoutStyle() ?? 'leverless',
  );
  const [remapMode, setRemapMode] = useState(false);
  const [selectedFn, setSelectedFn] = useState<LayoutButtonKey | null>(null);
  const [remap, setRemap] = useState<RemapState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

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

  const pinByKey = useMemo(
    () => new Map((mapping ?? []).map((m) => [m.buttonKey, m.pin])),
    [mapping],
  );
  const keyByPin = useMemo(
    () => new Map((mapping ?? []).map((m) => [m.pin, m.buttonKey])),
    [mapping],
  );

  useEffect(() => {
    loadControllerMapping()
      .then(setMapping)
      .catch(() => setMapping([]));
  }, []);

  const onStyleChange = (s: LayoutStyle) => {
    setStyle(s);
    saveLayoutStyle(s);
  };

  if (mapping === null) {
    return (
      <div data-testid="ctrl-waiting" className="tw-p-4">
        {t('waiting-for-controller')}
      </div>
    );
  }

  const remapState = remap ?? initRemapState(mapping);

  const enterRemap = () => {
    setRemap(initRemapState(mapping));
    setSelectedFn(null);
    setSaveError(false);
    setRemapMode(true);
  };

  const onButtonClick = (key: LayoutButtonKey) => {
    if (!selectedFn) return;
    const pin = pinByKey.get(key);
    if (pin === undefined) return;
    setRemap(assignFunction(remapState, pin, actionForButtonKey(selectedFn)));
  };

  const overrideLabel = (key: LayoutButtonKey): string | undefined => {
    if (!remapMode) return undefined;
    const pin = pinByKey.get(key);
    if (pin === undefined) return undefined;
    const workingKey = buttonKeyForAction(remapState.workingActions[pin]);
    return labelFor(workingKey ?? key);
  };

  const pendingKeySet = new Set<LayoutButtonKey>(
    pendingPins(remapState)
      .map((pin) => keyByPin.get(pin))
      .filter((k): k is LayoutButtonKey => Boolean(k)),
  );

  const onSave = () => {
    setSaving(true);
    setSaveError(false);
    saveRemap(remapState.workingActions)
      .then(() => loadControllerMapping())
      .then((m) => {
        setMapping(m);
        setRemap(initRemapState(m));
      })
      .catch(() => setSaveError(true))
      .finally(() => setSaving(false));
  };

  const onRevert = () => setRemap(initRemapState(mapping));

  return (
    <div className="tw-p-4 tw-space-y-4">
      <div className="tw-flex tw-items-center tw-justify-between">
        <h1 className="tw-text-lg tw-font-semibold">{t('controller-header')}</h1>
        <div className="tw-flex tw-items-center tw-gap-2">
          <LayoutStyleSelector value={style} onChange={onStyleChange} />
          <button
            type="button"
            data-testid="remap-toggle"
            onClick={remapMode ? () => setRemapMode(false) : enterRemap}
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

      {remapMode ? (
        <div className="tw-space-y-3">
          <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
            <span className="tw-text-sm tw-text-slate-400">
              {t('remap-select-hint')}
            </span>
            <RemapBar
              dirty={remapState.dirty}
              pendingCount={pendingKeySet.size}
              saving={saving}
              error={saveError}
              onSave={onSave}
              onRevert={onRevert}
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
                mapping={mapping}
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
                mapping={mapping}
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
