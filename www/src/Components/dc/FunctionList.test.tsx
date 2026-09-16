import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
