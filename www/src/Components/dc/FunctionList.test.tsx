import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FunctionList from './FunctionList';

const labelFor = (k: string) => (k === 'B1' ? 'Cross' : k);

describe('FunctionList', () => {
  it('renders functions and reports selection', async () => {
    const onSelect = vi.fn();
    render(<FunctionList selected={null} onSelect={onSelect} labelFor={labelFor} />);
    await userEvent.click(screen.getByTestId('fn-B1'));
    expect(onSelect).toHaveBeenCalledWith('B1');
    expect(screen.getByTestId('fn-B1')).toHaveTextContent('Cross');
  });
  it('marks the selected function active', () => {
    render(<FunctionList selected="B2" onSelect={() => {}} labelFor={labelFor} />);
    expect(screen.getByTestId('fn-B2')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('fn-B1')).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows common-name aliases for A1/A2 regardless of labelFor', () => {
    render(<FunctionList selected={null} onSelect={() => {}} labelFor={labelFor} />);
    expect(screen.getByTestId('fn-A1')).toHaveTextContent('A1/Start');
    expect(screen.getByTestId('fn-A2')).toHaveTextContent('A2/TPad');
  });

  it('is draggable and puts its function key on the drag payload', () => {
    render(<FunctionList selected={null} onSelect={() => {}} labelFor={labelFor} />);
    const b1 = screen.getByTestId('fn-B1');
    expect(b1).toHaveAttribute('draggable', 'true');
    const setData = vi.fn();
    fireEvent.dragStart(b1, { dataTransfer: { setData, effectAllowed: '' } });
    expect(setData).toHaveBeenCalledWith('text/plain', 'B1');
  });
});
