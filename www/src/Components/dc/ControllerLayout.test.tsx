import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('mirrors button positions when mirrored is set, keeping the same pin/function data', () => {
    const { unmount } = render(
      <ControllerLayout
        layoutStyle="leverless"
        mapping={mapping}
        heldPins={[]}
        labelFor={labelFor}
      />,
    );
    const normalCx = Number(
      screen.getByTestId('ctrl-btn-B1').querySelector('circle')?.getAttribute('cx'),
    );
    unmount();

    render(
      <ControllerLayout
        layoutStyle="leverless"
        mapping={mapping}
        heldPins={[]}
        labelFor={labelFor}
        mirrored
      />,
    );
    const b1 = screen.getByTestId('ctrl-btn-B1');
    // Same button/pin still renders (wiring is unaffected by mirroring) —
    // only its on-screen position moved.
    expect(b1).toHaveTextContent('Cross');
    expect(b1).toHaveTextContent('Pin 6');
    const mirroredCx = Number(b1.querySelector('circle')?.getAttribute('cx'));
    expect(mirroredCx).not.toBe(normalCx);
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

  it('calls onFunctionDrop with the dropped function key on a wired slot, and highlights it while dragging over', () => {
    const onFunctionDrop = vi.fn();
    render(
      <ControllerLayout
        layoutStyle="leverless"
        mapping={mapping}
        heldPins={[]}
        labelFor={(k) => k}
        onFunctionDrop={onFunctionDrop}
      />,
    );
    const b1 = screen.getByTestId('ctrl-btn-B1');
    const getData = vi.fn(() => 'S1');
    const dataTransfer = { getData, dropEffect: '' };

    fireEvent.dragOver(b1, { dataTransfer });
    expect(b1.querySelector('circle')).toHaveAttribute('stroke', '#f59e0b');

    fireEvent.drop(b1, { dataTransfer });
    expect(onFunctionDrop).toHaveBeenCalledWith('B1', 'S1');
  });

  it('does not treat unwired slots as drop targets', () => {
    const onFunctionDrop = vi.fn();
    render(
      <ControllerLayout
        layoutStyle="leverless"
        mapping={[]}
        heldPins={[]}
        labelFor={(k) => k}
        onFunctionDrop={onFunctionDrop}
      />,
    );
    // B1 has no entry in `mapping` here, so it's unwired/unclickable —
    // dropping on it should be a no-op, same as clicking it would be.
    const b1 = screen.getByTestId('ctrl-btn-B1');
    const dataTransfer = { getData: vi.fn(() => 'S1'), dropEffect: '' };
    fireEvent.drop(b1, { dataTransfer });
    expect(onFunctionDrop).not.toHaveBeenCalled();
  });

  it('still supports click-to-select-then-click alongside drag and drop', async () => {
    const onButtonClick = vi.fn();
    const onFunctionDrop = vi.fn();
    render(
      <ControllerLayout
        layoutStyle="leverless"
        mapping={mapping}
        heldPins={[]}
        labelFor={(k) => k}
        onButtonClick={onButtonClick}
        onFunctionDrop={onFunctionDrop}
      />,
    );
    await userEvent.click(screen.getByTestId('ctrl-btn-B1'));
    expect(onButtonClick).toHaveBeenCalledWith('B1');
    expect(onFunctionDrop).not.toHaveBeenCalled();
  });
});

describe('ControllerLayout extra buttons', () => {
  it('renders an extra button resolvable to a layout key via the normal mapping', () => {
    const mapping = [{ pin: 16, action: 13, buttonKey: 'S1' as const }];
    render(
      <ControllerLayout
        layoutStyle="leverless"
        mapping={mapping}
        heldPins={[]}
        labelFor={(k) => k}
        extraPlacements={[
          { key: 'extra-16', defaultPin: 16, action: 13, x: 350, y: 330, r: 22 },
        ]}
      />,
    );
    const extra = screen.getByTestId('ctrl-btn-extra-16');
    expect(extra).toHaveTextContent('S1');
    expect(extra).toHaveTextContent('Pin 16');
  });

  it('shows just the pin number, no made-up label, when the extra button has no layout key', () => {
    render(
      <ControllerLayout
        layoutStyle="leverless"
        mapping={[]}
        heldPins={[]}
        labelFor={(k) => k}
        extraPlacements={[
          { key: 'extra-18', defaultPin: 18, action: 32, x: 410, y: 330, r: 22 }, // TURBO
        ]}
      />,
    );
    const extra = screen.getByTestId('ctrl-btn-extra-18');
    expect(extra).toHaveTextContent('Pin 18');
    expect(extra.querySelectorAll('text')).toHaveLength(1);
  });

  it('fits the viewBox around a second row of extra buttons instead of clipping it', () => {
    const extraPlacements = Array.from({ length: 12 }, (_, i) => ({
      key: `extra-${i}`,
      defaultPin: 100 + i,
      action: 13,
      x: 350 + (i % 6) * 50,
      y: 320 + Math.floor(i / 6) * 52,
      r: 20,
    }));
    const { container } = render(
      <ControllerLayout
        layoutStyle="leverless"
        mapping={[]}
        heldPins={[]}
        labelFor={(k) => k}
        extraPlacements={extraPlacements}
      />,
    );
    const svg = container.querySelector('svg');
    const [, top, , height] = svg?.getAttribute('viewBox')?.split(' ').map(Number) ?? [];
    const lastRow = extraPlacements[extraPlacements.length - 1];
    expect(top + height).toBeGreaterThanOrEqual(lastRow.y + lastRow.r);
  });

  it('is clickable even when unresolvable to a mapping entry', async () => {
    const onButtonClick = vi.fn();
    render(
      <ControllerLayout
        layoutStyle="leverless"
        mapping={[]}
        heldPins={[]}
        labelFor={(k) => k}
        onButtonClick={onButtonClick}
        extraPlacements={[
          { key: 'extra-18', defaultPin: 18, action: 32, x: 410, y: 330, r: 22 },
        ]}
      />,
    );
    await userEvent.click(screen.getByTestId('ctrl-btn-extra-18'));
    expect(onButtonClick).toHaveBeenCalledWith('extra-18');
  });
});
