// @ts-expect-error - WebApi.js is untyped JS
import WebApi from '../../Services/WebApi';
import { isValidInputMode } from '../../Data/dc/inputModes';

const { getGamepadOptions, setGamepadOptions } = WebApi;

export type GeneralSettings = {
  inputMode: number;
  dpadMode: number;
  socdMode: number;
};

type GamepadApi = {
  // The stock WebApi.getGamepadOptions REQUIRES a setLoading callback — it calls
  // setLoading(true) unconditionally, so we always pass one (a no-op by default).
  getGamepadOptions: (
    setLoading?: (loading: boolean) => void,
  ) => Promise<Record<string, number>>;
  setGamepadOptions: (options: Record<string, number>) => Promise<unknown>;
};

const defaultApi: GamepadApi = { getGamepadOptions, setGamepadOptions };

const noop = () => {};

export async function loadGeneralSettings(
  api: GamepadApi = defaultApi,
): Promise<GeneralSettings> {
  const data = await api.getGamepadOptions(noop);
  return {
    inputMode: data.inputMode,
    dpadMode: data.dpadMode,
    socdMode: data.socdMode,
  };
}

export function validateGeneralSettings(s: GeneralSettings): string[] {
  const errors: string[] = [];
  const isNonNegInt = (n: number) => Number.isInteger(n) && n >= 0;
  if (!isValidInputMode(s.inputMode))
    errors.push('inputMode must be a valid GP2040-CE input mode');
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
