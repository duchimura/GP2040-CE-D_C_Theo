import { buttonKeyForAction } from './gpioActions';
import type { MappedButton } from '../../Hooks/dc/useControllerMapping';
import type { PinsType } from '../../Store/useProfilesStore';

export function profileToMappedButtons(profile: PinsType): MappedButton[] {
  const out: MappedButton[] = [];
  for (const [key, value] of Object.entries(profile)) {
    const m = /^pin(\d+)$/.exec(key);
    if (!m) continue;
    const action = (value as { action?: number })?.action;
    if (typeof action !== 'number') continue;
    const buttonKey = buttonKeyForAction(action);
    if (!buttonKey) continue;
    out.push({ pin: Number(m[1]), action, buttonKey });
  }
  return out;
}

export function actionsByPin(profile: PinsType): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [key, value] of Object.entries(profile)) {
    const m = /^pin(\d+)$/.exec(key);
    if (!m) continue;
    const action = (value as { action?: number })?.action;
    if (typeof action === 'number') out[Number(m[1])] = action;
  }
  return out;
}
