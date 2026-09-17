import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ControllerLayout from './ControllerLayout';

const labelFor = (k: string) => (k === 'B1' ? 'Cross' : k);

describe('ControllerLayout', () => {
  // Pins must match each key's real defaultPin from LAYOUTS — rendering now
  // resolves a placement by its fixed pin, not by the mapping's buttonKey.
  const mapping = [
    { pin: 6, action: 5, buttonKey: 'B1' as const },
    { pin: 2, action: 1, buttonKey: 'Up' as const },
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
    expect(b1).toHaveTextContent('Pin 6');
    expect(b1).toHaveAttribute('data-held', 'false');
  });

  it('marks a button held when its pin is in heldPins', () => {
    render(
      <ControllerLayout
        layoutStyle="leverless"
        mapping={mapping}
        heldPins={[2]}
        labelFor={labelFor}
      />,
    );
    expect(screen.getByTestId('ctrl-btn-Up')).toHaveAttribute('data-held', 'true');
    expect(screen.getByTestId('ctrl-btn-B1')).toHaveAttribute('data-held', 'false');
  });
});

describe('ControllerLayout duplicate function assignment', () => {
  it('shows both pins when two pins share a function, and clears the vacated slot', () => {
    // Regression test: L2 (default pin 9) reassigned onto pin 6 (default B1).
    // Both physical slots must independently reflect their own pin's action —
    // a buttonKey-keyed lookup would collapse these into one and show pin6 as
    // unassigned even though it now emits L2 too.
    const mapping = [
      { pin: 6, action: 11, buttonKey: 'L2' as const },
      { pin: 9, action: 11, buttonKey: 'L2' as const },
    ];
    render(
      <ControllerLayout
        layoutStyle="leverless"
        mapping={mapping}
        heldPins={[]}
        labelFor={(k) => k}
      />,
    );
    const b1Slot = screen.getByTestId('ctrl-btn-B1');
    const l2Slot = screen.getByTestId('ctrl-btn-L2');
    expect(b1Slot).toHaveTextContent('L2');
    expect(b1Slot).toHaveTextContent('Pin 6');
    expect(l2Slot).toHaveTextContent('L2');
    expect(l2Slot).toHaveTextContent('Pin 9');
  });
});

describe('ControllerLayout edit mode', () => {
  const mapping = [{ pin: 6, action: 5, buttonKey: 'B1' as const }];
  it('calls onButtonClick for a mapped button and shows override label + pending', async () => {
    const onButtonClick = vi.fn();
    render(
      <ControllerLayout
        layoutStyle="leverless"
        mapping={mapping}
        heldPins={[]}
        labelFor={(k) => k}
        onButtonClick={onButtonClick}
        overrideLabel={(k) => (k === 'B1' ? 'B2*' : undefined)}
        pendingKeys={new Set(['B1'])}
      />,
    );
    const b1 = screen.getByTestId('ctrl-btn-B1');
    expect(b1).toHaveTextContent('B2*');
    expect(b1).toHaveAttribute('data-pending', 'true');
    await userEvent.click(b1);
    expect(onButtonClick).toHaveBeenCalledWith('B1');
  });
});
