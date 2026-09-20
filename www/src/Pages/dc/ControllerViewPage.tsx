import { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { AppContext } from '../../Contexts/AppContext';
import { BUTTONS } from '../../Data/Buttons';
import { useHeldPinsMonitor } from '../../Hooks/dc/useHeldPinsMonitor';
import { useProfilesView } from '../../Hooks/dc/useProfilesView';
import { useConnectionStore } from '../../Store/useConnectionStore';
import { labelSetForInputMode } from '../../Data/dc/inputModes';
import { shortLabel } from '../../Data/dc/shortLabels';
import { faceStyleFor } from '../../Data/dc/faceButtons';
import ControllerLayout from '../../Components/dc/ControllerLayout';
import SystemStatsPanel from '../../Components/dc/SystemStatsPanel';
import FunctionList from '../../Components/dc/FunctionList';
import RemapBar from '../../Components/dc/RemapBar';
import ProfilesBar from '../../Components/dc/ProfilesBar';
import LayoutStyleSelector from '../../Components/dc/LayoutStyleSelector';
import MirroredToggle from '../../Components/dc/MirroredToggle';
import InputModeSelector from '../../Components/dc/InputModeSelector';
import {
  readSavedLayoutStyle,
  saveLayoutStyle,
} from '../../Components/dc/layoutStylePreference';
import {
  readSavedMirrored,
  saveMirrored,
} from '../../Components/dc/mirroredPreference';
import { getLayout, type LayoutStyle } from '../../Data/dc/layouts';
import { computeExtraPlacements } from '../../Data/dc/extraButtons';
import {
  ASSIGNABLE_FUNCTIONS,
  actionForButtonKey,
  buttonKeyForAction,
  type LayoutButtonKey,
} from '../../Data/dc/gpioActions';

export default function ControllerViewPage() {
  const { t } = useTranslation('DC');
  const location = useLocation();
  const isPinMappingRoute = location.pathname === '/pin-mapping';
  const view = useProfilesView();
  const [style, setStyle] = useState<LayoutStyle>(
    readSavedLayoutStyle() ?? 'leverless',
  );
  const [mirrored, setMirrored] = useState<boolean>(readSavedMirrored());
  // The GPIO Pin Configurator route is specifically for remapping, so start
  // there with remap already on rather than making that an extra click.
  const [remapMode, setRemapMode] = useState(isPinMappingRoute);
  const [selectedFn, setSelectedFn] = useState<LayoutButtonKey | null>(null);
  const [saving, setSaving] = useState(false);

  // Keep identify polling on during remap too, so pressing a button on the
  // real controller lights up its slot while you're picking which one to
  // remap — just pause across the actual save request so it doesn't compete
  // with that call on the board's single-connection httpd.
  const heldPins = useHeldPinsMonitor(!saving);

  const appContext = useContext(AppContext) as {
    buttonLabels?: { buttonLabelType?: string };
  };
  // The device's own input mode decides the labels (so the visualizer mirrors
  // whatever console it's emulating, no matter which page changed it); modes
  // with no matching set fall back to the nav's label dropdown.
  const inputMode = useConnectionStore((s) => s.inputMode);
  const labelSetKey =
    (inputMode !== null ? labelSetForInputMode(inputMode) : undefined) ??
    appContext?.buttonLabels?.buttonLabelType ??
    'gp2040';
  const labelSet =
    (BUTTONS as Record<string, Record<string, string>>)[labelSetKey] ??
    (BUTTONS as Record<string, Record<string, string>>).gp2040;
  const labelFor = (key: string): string => labelSet[key] ?? key;
  // Text drawn inside the button circles is shortened where it wouldn't fit.
  const circleLabelFor = (key: string): string => shortLabel(labelFor(key));

  useEffect(() => {
    view.load();
  }, []);

  // If that first attempt fails (e.g. the board isn't reachable yet), retry
  // silently whenever the connection banner reports we're connected — no
  // manual retry button, matching how the page just resolves on its own once
  // the controller is actually there. Only while still empty: once a load has
  // succeeded, a later reconnect shouldn't clobber in-progress remap edits.
  const connectionStatus = useConnectionStore((s) => s.status);
  useEffect(() => {
    if (connectionStatus === 'connected' && view.profiles.length === 0) {
      view.load();
    }
  }, [connectionStatus]);

  // Which physical board this is — picks the right pin wiring for the fixed
  // 12 slots below (see Data/dc/layouts.ts) so the same D_C_Theo build works
  // correctly across different manufacturers' boards, not just the one it
  // was tuned against.
  const boardConfig = useConnectionStore((s) => s.controllerInfo?.boardConfig);

  // Sticky version of boardConfig: useConnectionStore.checkConnection clears
  // controllerInfo (hence boardConfig) on ANY failed poll, not just before
  // the first successful connection — a dropped packet or the board being
  // briefly busy mid-save, not only a cold start. The board's physical
  // identity can't change mid-session, so once we've resolved it once, keep
  // using that last-known value rather than blanking the whole page behind
  // the loading placeholder on a transient disconnect; ConnectionBanner
  // already surfaces "lost" separately.
  const [resolvedBoardConfig, setResolvedBoardConfig] = useState<
    string | undefined
  >(boardConfig);
  useEffect(() => {
    if (boardConfig) {
      setResolvedBoardConfig(boardConfig);
    }
  }, [boardConfig]);

  // The initial useState above only covers a direct/full-page load of
  // /pin-mapping — navigating here in-app re-renders this same component
  // instance rather than remounting it, so react to the route itself
  // switching to (or away from) it.
  useEffect(() => {
    setRemapMode(isPinMappingRoute);
  }, [isPinMappingRoute]);

  const onStyleChange = (s: LayoutStyle) => {
    setStyle(s);
    saveLayoutStyle(s);
  };

  const onMirroredChange = (m: boolean) => {
    setMirrored(m);
    saveMirrored(m);
  };

  // Buttons wired beyond the standard 12 (8-button cluster + 4 directions) —
  // detected from the profile's actual pin/action assignments, not hardcoded,
  // so any board's extra buttons show up automatically.
  const extraPlacements = useMemo(
    () =>
      computeExtraPlacements(style, view.currentActions, resolvedBoardConfig, mirrored),
    [style, view.currentActions, resolvedBoardConfig, mirrored],
  );

  // Each slot's pin is a fixed hardware fact (from getLayout/extraPlacements),
  // not something derived from the profile — a pin can be reassigned to any
  // function (including one another pin already has), so identity must never
  // be keyed by function name.
  const pinByKey = useMemo(
    () =>
      new Map(
        [
          ...getLayout(style, resolvedBoardConfig, mirrored).placements,
          ...extraPlacements,
        ].map((p) => [p.key, p.defaultPin]),
      ),
    [style, resolvedBoardConfig, mirrored, extraPlacements],
  );

  // In remap mode a slot shows the function it's being (re)assigned, not the
  // saved one. No override for an unresolved working function — ControllerLayout's
  // own fallback then applies (no made-up label, just the pin number for extras).
  const workingKeyFor = (key: string): string | undefined => {
    if (!remapMode) return undefined;
    const pin = pinByKey.get(key);
    if (pin === undefined) return undefined;
    return buttonKeyForAction(view.currentActions[pin]) ?? undefined;
  };
  const overrideLabel = (key: string): string | undefined => {
    const workingKey = workingKeyFor(key);
    return workingKey ? circleLabelFor(workingKey) : undefined;
  };
  const faceStyleForKey = (key: string) => faceStyleFor(labelSetKey, key);

  const pendingKeySet = new Set<string>(
    Array.from(pinByKey.entries())
      .filter(([, pin]) => view.currentActions[pin] !== view.snapshotActions[pin])
      .map(([key]) => key),
  );

  const onButtonClick = (key: string) => {
    if (!selectedFn) return;
    const pin = pinByKey.get(key);
    if (pin === undefined) return;
    view.assignFunctionToPin(pin, actionForButtonKey(selectedFn));
  };

  // Dragging a function from the list straight onto a button — same effect
  // as select-then-click, in one gesture. Click-to-select-then-click stays
  // fully intact via onButtonClick above.
  const onFunctionDrop = (key: string, functionKey: string) => {
    if (!ASSIGNABLE_FUNCTIONS.includes(functionKey as LayoutButtonKey)) return;
    const pin = pinByKey.get(key);
    if (pin === undefined) return;
    view.assignFunctionToPin(pin, actionForButtonKey(functionKey as LayoutButtonKey));
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

  // Profile data can load slightly ahead of the connection store resolving
  // the board's identity (two independent polling paths — see
  // Store/useConnectionStore.ts). Rendering in that gap would silently fall
  // back to PICO_WIRING for boards that aren't a Pico, exactly the bug class
  // this table's auto-generation (Data/dc/layouts.ts) fixes elsewhere. Gated
  // on the STICKY resolvedBoardConfig, not live connectionStatus/boardConfig,
  // so this only ever shows before the board's identity has ever been
  // resolved (genuine cold start) — never again afterward, even across a
  // later transient disconnect.
  if (!resolvedBoardConfig) {
    return (
      <div data-testid="ctrl-loading-board" className="tw-p-4">
        {t('loading-button-map')}
      </div>
    );
  }

  return (
    <div className="tw-p-4 tw-space-y-4">
      <div className="tw-flex tw-items-center tw-justify-between">
        <h1 className="tw-text-lg tw-font-semibold">{t('controller-header')}</h1>
        <div className="tw-flex tw-items-center tw-gap-2">
          <LayoutStyleSelector value={style} onChange={onStyleChange} />
          <InputModeSelector />
          <MirroredToggle value={mirrored} onChange={onMirroredChange} />
          <button
            type="button"
            data-testid="remap-toggle"
            onClick={remapMode ? () => setRemapMode(false) : () => setRemapMode(true)}
            className={`tw-rounded tw-border tw-border-slate-300 dark:tw-border-slate-600 tw-px-3 tw-py-1 tw-text-sm ${
              remapMode
                ? 'tw-bg-sky-600 tw-text-white'
                : 'tw-bg-transparent tw-text-slate-600 dark:tw-text-slate-300'
            }`}
          >
            {remapMode ? t('remap-exit') : t('remap')}
          </button>
        </div>
      </div>

      {(remapMode || isPinMappingRoute) && (
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
      )}

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
            <div className="tw-flex-1 tw-flex tw-justify-center">
              <ControllerLayout
                layoutStyle={style}
                mapping={view.snapshotMapping}
                heldPins={heldPins}
                labelFor={circleLabelFor}
                onButtonClick={onButtonClick}
                onFunctionDrop={onFunctionDrop}
                overrideLabel={overrideLabel}
                overrideButtonKey={workingKeyFor}
                faceStyleFor={faceStyleForKey}
                pendingKeys={pendingKeySet}
                extraPlacements={extraPlacements}
                boardConfig={resolvedBoardConfig}
                mirrored={mirrored}
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
            <div className="tw-flex-1 tw-flex tw-justify-center">
              <ControllerLayout
                layoutStyle={style}
                mapping={view.currentMapping}
                heldPins={heldPins}
                labelFor={circleLabelFor}
                faceStyleFor={faceStyleForKey}
                extraPlacements={extraPlacements}
                boardConfig={resolvedBoardConfig}
                mirrored={mirrored}
              />
            </div>
            {!isPinMappingRoute && <SystemStatsPanel />}
          </div>
        </>
      )}
    </div>
  );
}
