import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MirroredToggle from './MirroredToggle';

describe('MirroredToggle', () => {
  it('reflects the current value via aria-pressed', () => {
    const { rerender } = render(<MirroredToggle value={false} onChange={vi.fn()} />);
    expect(screen.getByTestId('mirrored-toggle')).toHaveAttribute('aria-pressed', 'false');
    rerender(<MirroredToggle value={true} onChange={vi.fn()} />);
    expect(screen.getByTestId('mirrored-toggle')).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onChange with the flipped value on click', async () => {
    const onChange = vi.fn();
    render(<MirroredToggle value={false} onChange={onChange} />);
    await userEvent.click(screen.getByTestId('mirrored-toggle'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
