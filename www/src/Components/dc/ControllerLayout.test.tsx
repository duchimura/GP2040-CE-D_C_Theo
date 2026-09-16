import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ControllerLayout from './ControllerLayout';

const labelFor = (k: string) => (k === 'B1' ? 'Cross' : k);

describe('ControllerLayout', () => {
  const mapping = [
    { pin: 0, action: 5, buttonKey: 'B1' as const },
    { pin: 7, action: 1, buttonKey: 'Up' as const },
  ];

  it('renders labels and pins for mapped buttons', () => {
    render(
      <ControllerLayout
        layoutStyle="leverless"
        mapping={mapping}
        heldPins={[]}
        labelFor={labelFor}
      />,
    );
    const b1 = screen.getByTestId('ctrl-btn-B1');
    expect(b1).toHaveTextContent('Cross');
    expect(b1).toHaveTextContent('Pin 0');
    expect(b1).toHaveAttribute('data-held', 'false');
  });

  it('marks a button held when its pin is in heldPins', () => {
    render(
      <ControllerLayout
        layoutStyle="leverless"
        mapping={mapping}
        heldPins={[7]}
        labelFor={labelFor}
      />,
    );
    expect(screen.getByTestId('ctrl-btn-Up')).toHaveAttribute('data-held', 'true');
    expect(screen.getByTestId('ctrl-btn-B1')).toHaveAttribute('data-held', 'false');
  });
});
