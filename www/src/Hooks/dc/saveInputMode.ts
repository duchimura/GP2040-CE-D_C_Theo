import WebApi from '../../Services/WebApi';
import { hexToInt } from '../../Services/Utilities';
import { isValidInputMode } from '../../Data/dc/inputModes';

const { getGamepadOptions, setGamepadOptions } = WebApi;

type GamepadApi = {
  // The stock WebApi.getGamepadOptions REQUIRES a setLoading callback — it calls
  // setLoading(true) unconditionally, so we always pass one.
  getGamepadOptions: (
    setLoading: (loading: boolean) => void,
  ) => Promise<Record<string, unknown> | undefined>;
  // Resolves false (rather than throwing) when the request fails.
  setGamepadOptions: (options: Record<string, unknown>) => Promise<unknown>;
};

const defaultApi: GamepadApi = { getGamepadOptions, setGamepadOptions };

const noop = () => {};

const usbId = (value: unknown): number => hexToInt(String(value || '0000'));

// The firmware reads every gamepad option as `var = doc[key]`, so a field left
// out of the POST is written as 0/empty. Changing the input mode therefore has
// to read the current options and send ALL of them back, exactly as the stock
// Settings page does (including its hex -> number USB ID conversion).
export async function saveInputMode(
  mode: number,
  api: GamepadApi = defaultApi,
): Promise<void> {
  if (!isValidInputMode(mode)) throw new Error('invalid input mode');
  const current = await api.getGamepadOptions(noop);
  if (!current) throw new Error('could not read current options');
  const saved = await api.setGamepadOptions({
    ...current,
    inputMode: mode,
    usbVendorID: usbId(current.usbVendorID),
    usbProductID: usbId(current.usbProductID),
  });
  if (saved === false) throw new Error('save failed');
}
