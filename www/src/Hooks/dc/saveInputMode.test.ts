import { describe, it, expect, vi } from 'vitest';
import { saveInputMode } from './saveInputMode';

const fullOptions = {
  inputMode: 4,
  dpadMode: 1,
  socdMode: 2,
  profileNumber: 2,
  debounceDelay: 5,
  usbDescProduct: 'GP2040-CE (Custom)',
  usbVendorID: '10C4',
  usbProductID: '82C0',
};

const makeApi = (options: unknown = fullOptions, saved: unknown = true) => ({
  getGamepadOptions: vi.fn().mockResolvedValue(options),
  setGamepadOptions: vi.fn().mockResolvedValue(saved),
});

describe('saveInputMode', () => {
  // The firmware reads every field as `var = doc[key]`, so a field missing
  // from the POST is written as 0/empty. A partial post would wipe the rest of
  // the user's gamepad options — always send the whole object back.
  it('posts the full options with only inputMode changed', async () => {
    const api = makeApi();
    await saveInputMode(1, api);
    expect(api.setGamepadOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        inputMode: 1,
        dpadMode: 1,
        socdMode: 2,
        profileNumber: 2,
        debounceDelay: 5,
        usbDescProduct: 'GP2040-CE (Custom)',
      }),
    );
  });

  it('converts the hex USB IDs to numbers like the stock settings page', async () => {
    const api = makeApi();
    await saveInputMode(1, api);
    expect(api.setGamepadOptions).toHaveBeenCalledWith(
      expect.objectContaining({ usbVendorID: 0x10c4, usbProductID: 0x82c0 }),
    );
  });

  it('falls back to 0 for missing USB IDs', async () => {
    const api = makeApi({ ...fullOptions, usbVendorID: undefined, usbProductID: '' });
    await saveInputMode(1, api);
    expect(api.setGamepadOptions).toHaveBeenCalledWith(
      expect.objectContaining({ usbVendorID: 0, usbProductID: 0 }),
    );
  });

  it('passes a setLoading callback (stock WebApi requires one)', async () => {
    const api = makeApi();
    await saveInputMode(1, api);
    expect(api.getGamepadOptions).toHaveBeenCalledWith(expect.any(Function));
  });

  it('rejects an invalid mode without touching the device', async () => {
    const api = makeApi();
    await expect(saveInputMode(99, api)).rejects.toThrow();
    expect(api.getGamepadOptions).not.toHaveBeenCalled();
    expect(api.setGamepadOptions).not.toHaveBeenCalled();
  });

  it('refuses to save when the current options could not be read', async () => {
    const api = makeApi(null);
    await expect(saveInputMode(1, api)).rejects.toThrow();
    expect(api.setGamepadOptions).not.toHaveBeenCalled();
  });

  it('throws when the device reports the save failed', async () => {
    const api = makeApi(fullOptions, false);
    await expect(saveInputMode(1, api)).rejects.toThrow();
  });
});
