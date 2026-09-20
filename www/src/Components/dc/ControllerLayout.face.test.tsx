import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ControllerLayout from './ControllerLayout';

// Pins are each key's real defaultPin on the default (Pico) wiring.
const mapping = [
  { pin: 6, action: 5, buttonKey: 'B1' as const },
  { pin: 7, action: 6, buttonKey: 'B2' as const },
];

const face = (key: string) =>
  key === 'B1'
    ? { shape: 'cross' as const, color: '#7fb2f0' }
    : key === 'B2'
      ? { color: '#f0554b' }
      : undefined;

const labelFor = (k: string) => (k === 'B1' ? 'Cross' : k === 'B2' ? 'Circle' : k);

const renderFace = (heldPins: number[] = [], extra = {}) =>
  render(
    <ControllerLayout
      layoutStyle="leverless"
      mapping={mapping}
      heldPins={heldPins}
      labelFor={labelFor}
      faceStyleFor={face}
      {...extra}
    />,
  );

describe('ControllerLayout face-button styling', () => {
  it('draws a shape instead of text, keeping the label as a title and the pin', () => {
    renderFace();
    const b1 = screen.getByTestId('ctrl-btn-B1');
    expect(b1.querySelector('[data-shape="cross"]')).not.toBeNull();
    expect(b1.querySelector('text')?.textContent).toBe('Pin 6'); // only the pin line is text
    expect(b1.querySelector('title')?.textContent).toBe('Cross');
  });

  it('colors the text label when the style has no shape', () => {
    renderFace();
    const label = screen.getByTestId('ctrl-btn-B2').querySelector('text');
    expect(label).toHaveAttribute('fill', '#f0554b');
    expect(label).toHaveTextContent('Circle');
  });

  it('turns the glyph and colored text dark while the button is held', () => {
    renderFace([6, 7]);
    expect(
      screen.getByTestId('ctrl-btn-B1').querySelector('[data-shape] [stroke]'),
    ).toHaveAttribute('stroke', '#0b1220');
    expect(screen.getByTestId('ctrl-btn-B2').querySelector('text')).toHaveAttribute(
      'fill',
      '#0b1220',
    );
  });

  it('leaves buttons without a style as plain text', () => {
    renderFace();
    expect(screen.getByTestId('ctrl-btn-Up').querySelector('[data-shape]')).toBeNull();
  });

  it('styles by the overridden function key (remap-mode pending change)', () => {
    renderFace([], {
      overrideLabel: (k: string) => (k === 'B2' ? 'Cross' : undefined),
      overrideButtonKey: (k: string) => (k === 'B2' ? 'B1' : undefined),
    });
    expect(
      screen.getByTestId('ctrl-btn-B2').querySelector('[data-shape="cross"]'),
    ).not.toBeNull();
  });
});

describe('ControllerLayout label fitting', () => {
  it('shrinks long labels to fit the circle', () => {
    render(
      <ControllerLayout
        layoutStyle="leverless"
        mapping={mapping}
        heldPins={[]}
        labelFor={(k) => (k === 'B1' ? 'Options' : k)}
      />,
    );
    const text = screen.getByTestId('ctrl-btn-B1').querySelector('text') as SVGElement;
    const size = parseFloat(text.style.fontSize);
    expect(size).toBeLessThan(13);
    expect(size).toBeGreaterThanOrEqual(8);
  });
});
