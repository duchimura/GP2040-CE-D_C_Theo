import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppContext } from '../../Contexts/AppContext';
import { BUTTONS } from '../../Data/Buttons';
import {
  loadControllerMapping,
  type MappedButton,
} from '../../Hooks/dc/useControllerMapping';
import { useHeldPinsMonitor } from '../../Hooks/dc/useHeldPinsMonitor';
import ControllerLayout from '../../Components/dc/ControllerLayout';
import SystemStatsPanel from '../../Components/dc/SystemStatsPanel';
import LayoutStyleSelector from '../../Components/dc/LayoutStyleSelector';
import {
  readSavedLayoutStyle,
  saveLayoutStyle,
} from '../../Components/dc/layoutStylePreference';
import type { LayoutStyle } from '../../Data/dc/layouts';
import type { LayoutButtonKey } from '../../Data/dc/gpioActions';

export default function ControllerViewPage() {
  const { t } = useTranslation('DC');
  const [mapping, setMapping] = useState<MappedButton[] | null>(null);
  const [style, setStyle] = useState<LayoutStyle>(
    readSavedLayoutStyle() ?? 'leverless',
  );
  const heldPins = useHeldPinsMonitor(true);

  const appContext = useContext(AppContext) as {
    buttonLabels?: { buttonLabelType?: string };
  };
  const labelSetKey = appContext?.buttonLabels?.buttonLabelType ?? 'gp2040';
  const labelSet =
    (BUTTONS as Record<string, Record<string, string>>)[labelSetKey] ??
    (BUTTONS as Record<string, Record<string, string>>).gp2040;
  const labelFor = (key: LayoutButtonKey): string => labelSet[key] ?? key;

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

  return (
    <div className="tw-p-4 tw-space-y-4">
      <div className="tw-flex tw-items-center tw-justify-between">
        <h1 className="tw-text-lg tw-font-semibold">{t('controller-header')}</h1>
        <LayoutStyleSelector value={style} onChange={onStyleChange} />
      </div>
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
    </div>
  );
}
