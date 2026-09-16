import { invert } from 'lodash';
import { BUTTON_ACTIONS } from '../Pins';

export type LayoutButtonKey =
  | 'Up' | 'Down' | 'Left' | 'Right'
  | 'B1' | 'B2' | 'B3' | 'B4'
  | 'L1' | 'R1' | 'L2' | 'R2'
  | 'S1' | 'S2' | 'A1' | 'A2' | 'L3' | 'R3';

// GpioAction enum key (e.g. 'BUTTON_PRESS_B1') -> layout key ('B1').
const ACTION_KEY_TO_LAYOUT: Record<string, LayoutButtonKey> = {
  BUTTON_PRESS_UP: 'Up', BUTTON_PRESS_DOWN: 'Down',
  BUTTON_PRESS_LEFT: 'Left', BUTTON_PRESS_RIGHT: 'Right',
  BUTTON_PRESS_B1: 'B1', BUTTON_PRESS_B2: 'B2',
  BUTTON_PRESS_B3: 'B3', BUTTON_PRESS_B4: 'B4',
  BUTTON_PRESS_L1: 'L1', BUTTON_PRESS_R1: 'R1',
  BUTTON_PRESS_L2: 'L2', BUTTON_PRESS_R2: 'R2',
  BUTTON_PRESS_S1: 'S1', BUTTON_PRESS_S2: 'S2',
  BUTTON_PRESS_A1: 'A1', BUTTON_PRESS_A2: 'A2',
  BUTTON_PRESS_L3: 'L3', BUTTON_PRESS_R3: 'R3',
};

const NUMBER_TO_ACTION_KEY = invert(BUTTON_ACTIONS) as Record<string, string>;

export function buttonKeyForAction(action: number): LayoutButtonKey | null {
  const actionKey = NUMBER_TO_ACTION_KEY[String(action)];
  if (!actionKey) return null;
  return ACTION_KEY_TO_LAYOUT[actionKey] ?? null;
}

const LAYOUT_TO_ACTION_KEY: Record<LayoutButtonKey, string> = Object.fromEntries(
  Object.entries(ACTION_KEY_TO_LAYOUT).map(([actionKey, layoutKey]) => [
    layoutKey,
    actionKey,
  ]),
) as Record<LayoutButtonKey, string>;

export function actionForButtonKey(key: LayoutButtonKey): number {
  return BUTTON_ACTIONS[LAYOUT_TO_ACTION_KEY[key] as keyof typeof BUTTON_ACTIONS];
}

export const ASSIGNABLE_FUNCTIONS: LayoutButtonKey[] = [
  'Up', 'Down', 'Left', 'Right',
  'B1', 'B2', 'B3', 'B4',
  'L1', 'R1', 'L2', 'R2',
  'S1', 'S2', 'A1', 'A2', 'L3', 'R3',
];
