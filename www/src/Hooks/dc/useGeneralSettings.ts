// @ts-expect-error - WebApi.js is untyped JS
import { getGamepadOptions, setGamepadOptions } from '../../Services/WebApi';

export type GeneralSettings = {
  inputMode: number;
  dpadMode: number;
  socdMode: number;
};

type GamepadApi = {
  getGamepadOptions: (...args: unknown[]) => Promise<Record<string, number>>;
  setGamepadOptions: (options: Record<string, number>) => Promise<unknown>;
};

const defaultApi: GamepadApi = { getGamepadOptions, setGamepadOptions };

export async function loadGeneralSettings(
  api: GamepadApi = defaultApi,
): Promise<GeneralSettings> {
  const data = await api.getGamepadOptions();
  return {
    inputMode: data.inputMode,
    dpadMode: data.dpadMode,
    socdMode: data.socdMode,
  };
}

export function validateGeneralSettings(s: GeneralSettings): string[] {
  const errors: string[] = [];
  const isNonNegInt = (n: number) => Number.isInteger(n) && n >= 0;
  if (!isNonNegInt(s.inputMode) || s.inputMode > 13)
    errors.push('inputMode must be an integer 0–13');
  if (!isNonNegInt(s.dpadMode))
    errors.push('dpadMode must be a non-negative integer');
  if (!isNonNegInt(s.socdMode))
    errors.push('socdMode must be a non-negative integer');
  return errors;
}

export async function saveGeneralSettings(
  s: GeneralSettings,
  api: GamepadApi = defaultApi,
): Promise<void> {
  if (validateGeneralSettings(s).length > 0) throw new Error('invalid');
  await api.setGamepadOptions(s);
}
