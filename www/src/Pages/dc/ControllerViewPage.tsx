import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../Contexts/AppContext';
import { BUTTONS } from '../../Data/Buttons';
import {
  loadControllerMapping,
  type MappedButton,
} from '../../Hooks/dc/useControllerMapping';
import { useHeldPinsMonitor } from '../../Hooks/dc/useHeldPinsMonitor';
import ControllerLayout from '../../Components/dc/ControllerLayout';
import LayoutStyleSelector, {
  readSavedLayoutStyle,
  saveLayoutStyle,
} from '../../Components/dc/LayoutStyleSelector';
import type { LayoutStyle } from '../../Data/dc/layouts';
import type { LayoutButtonKey } from '../../Data/dc/gpioActions';

export default function ControllerViewPage() {
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
        Waiting for controller…
      </div>
    );
  }

  return (
    <div className="tw-p-4 tw-space-y-4">
      <div className="tw-flex tw-items-center tw-justify-between">
        <h1 className="tw-text-lg tw-font-semibold">Controller</h1>
        <LayoutStyleSelector value={style} onChange={onStyleChange} />
      </div>
      <p className="tw-text-sm tw-text-slate-400">
        Each button shows its label and GPIO pin. Press a button on your
        controller to light it up here.
      </p>
      <ControllerLayout
        layoutStyle={style}
        mapping={mapping}
        heldPins={heldPins}
        labelFor={labelFor}
      />
    </div>
  );
}
