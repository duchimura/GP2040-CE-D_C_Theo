// User-facing GP2040-CE input modes, derived from the firmware InputMode enum
// (proto/enums.proto). "Input mode" is the console/protocol the controller
// emulates over USB. Value 255 (CONFIG) is the internal web-config mode and is
// intentionally not offered as a selectable output mode.
export type InputModeOption = { value: number; label: string };

export const INPUT_MODES: InputModeOption[] = [
  { value: 0, label: 'XInput (Xbox 360)' },
  { value: 1, label: 'Nintendo Switch' },
  { value: 2, label: 'PS3' },
  { value: 3, label: 'Keyboard' },
  { value: 4, label: 'PS4' },
  { value: 5, label: 'Xbox One' },
  { value: 6, label: 'Sega Genesis / Mega Drive Mini' },
  { value: 7, label: 'Neo Geo Mini' },
  { value: 8, label: 'PC Engine / TurboGrafx-16 Mini' },
  { value: 9, label: 'Egret II Mini' },
  { value: 10, label: 'Astro City Mini' },
  { value: 11, label: 'PlayStation Classic' },
  { value: 12, label: 'Original Xbox' },
  { value: 13, label: 'PS5' },
  { value: 14, label: 'Generic HID' },
  { value: 15, label: 'Switch Pro' },
  { value: 16, label: 'PS5 (P5 General)' },
  { value: 17, label: 'SInput' },
];

const VALID_VALUES = new Set(INPUT_MODES.map((m) => m.value));

export const isValidInputMode = (n: number): boolean =>
  Number.isInteger(n) && VALID_VALUES.has(n);

// The stock web UI's button-label sets (Data/Buttons.js keys) that correspond to
// a console. Modes with no matching set (Keyboard, the Mini consoles, ...) are
// omitted so the user's current label choice is left alone.
const LABEL_SET_BY_INPUT_MODE: Record<number, string> = {
  0: 'xinput',
  1: 'switch',
  2: 'ps3',
  4: 'ps4',
  5: 'xinput',
  11: 'ps3',
  12: 'xinput',
  13: 'ps4',
  14: 'dinput',
  15: 'switch',
  16: 'ps4',
  17: 'sinput',
};

export const labelSetForInputMode = (mode: number): string | undefined =>
  LABEL_SET_BY_INPUT_MODE[mode];
