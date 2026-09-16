import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LayoutStyleSelector from './LayoutStyleSelector';

describe('LayoutStyleSelector', () => {
  it('renders a control per style and reports selection', async () => {
    const onChange = vi.fn();
    render(<LayoutStyleSelector value="leverless" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /arcade/i }));
    expect(onChange).toHaveBeenCalledWith('arcadeStick');
  });

  it('marks the active style with aria-pressed', () => {
    const onChange = vi.fn();
    render(<LayoutStyleSelector value="leverless" onChange={onChange} />);
    expect(screen.getByRole('button', { name: /leverless/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
