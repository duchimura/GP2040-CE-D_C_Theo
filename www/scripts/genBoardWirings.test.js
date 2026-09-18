import { describe, it, expect } from 'vitest';
import { extractBoardWiring } from './genBoardWirings.js';

describe('extractBoardWiring', () => {
  it('extracts all 12 fixed-slot keys from conventional BoardConfig.h macros', () => {
    const contents = `
#define GPIO_PIN_02 GpioAction::BUTTON_PRESS_UP     // UP
#define GPIO_PIN_03 GpioAction::BUTTON_PRESS_DOWN   // DOWN
#define GPIO_PIN_04 GpioAction::BUTTON_PRESS_RIGHT  // RIGHT
#define GPIO_PIN_05 GpioAction::BUTTON_PRESS_LEFT   // LEFT
#define GPIO_PIN_06 GpioAction::BUTTON_PRESS_B1     // B1
#define GPIO_PIN_07 GpioAction::BUTTON_PRESS_B2     // B2
#define GPIO_PIN_08 GpioAction::BUTTON_PRESS_R2     // R2
#define GPIO_PIN_09 GpioAction::BUTTON_PRESS_L2     // L2
#define GPIO_PIN_10 GpioAction::BUTTON_PRESS_B3     // B3
#define GPIO_PIN_11 GpioAction::BUTTON_PRESS_B4     // B4
#define GPIO_PIN_12 GpioAction::BUTTON_PRESS_R1     // R1
#define GPIO_PIN_13 GpioAction::BUTTON_PRESS_L1     // L1
`;
    expect(extractBoardWiring(contents)).toEqual({
      Up: 2, Down: 3, Right: 4, Left: 5,
      B1: 6, B2: 7, R2: 8, L2: 9,
      B3: 10, B4: 11, R1: 12, L1: 13,
    });
  });

  it('keeps the first pin when a function is wired twice, like a labeled secondary input', () => {
    const contents = `
#define GPIO_PIN_11 GpioAction::BUTTON_PRESS_UP     // UP
#define GPIO_PIN_08 GpioAction::BUTTON_PRESS_DOWN   // DOWN
#define GPIO_PIN_10 GpioAction::BUTTON_PRESS_RIGHT  // RIGHT
#define GPIO_PIN_07 GpioAction::BUTTON_PRESS_LEFT   // LEFT

// Additional accessibility inputs
#define GPIO_PIN_20 GpioAction::BUTTON_PRESS_UP     // UP
`;
    expect(extractBoardWiring(contents)?.Up).toBe(11);
  });

  it('returns null when any of the 4 directions is missing (not a real D-pad board)', () => {
    const contents = `
#define GPIO_PIN_02 GpioAction::BUTTON_PRESS_UP     // UP
#define GPIO_PIN_03 GpioAction::BUTTON_PRESS_DOWN   // DOWN
#define GPIO_PIN_04 GpioAction::BUTTON_PRESS_RIGHT  // RIGHT
`;
    expect(extractBoardWiring(contents)).toBeNull();
  });

  it('tolerates leading whitespace before #define, as some boards use', () => {
    const contents = [
      ' #define GPIO_PIN_02 GpioAction::BUTTON_PRESS_UP',
      '#define GPIO_PIN_03 GpioAction::BUTTON_PRESS_DOWN',
      '#define GPIO_PIN_04 GpioAction::BUTTON_PRESS_RIGHT',
      '#define GPIO_PIN_05 GpioAction::BUTTON_PRESS_LEFT',
    ].join('\n');
    expect(extractBoardWiring(contents)?.Up).toBe(2);
  });
});
