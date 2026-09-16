import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RemapBar from './RemapBar';

describe('RemapBar', () => {
  it('enables Save/Revert only when dirty and reports clicks', async () => {
    const onSave = vi.fn();
    const onRevert = vi.fn();
    const { rerender } = render(
      <RemapBar
        dirty={false}
        pendingCount={0}
        saving={false}
        error={false}
        onSave={onSave}
        onRevert={onRevert}
      />,
    );
    expect(screen.getByTestId('remap-save')).toBeDisabled();
    rerender(
      <RemapBar
        dirty={true}
        pendingCount={2}
        saving={false}
        error={false}
        onSave={onSave}
        onRevert={onRevert}
      />,
    );
    expect(screen.getByTestId('remap-pending')).toHaveTextContent('2');
    await userEvent.click(screen.getByTestId('remap-save'));
    expect(onSave).toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('remap-revert'));
    expect(onRevert).toHaveBeenCalled();
  });
  it('shows an error line when error', () => {
    render(
      <RemapBar
        dirty
        pendingCount={1}
        saving={false}
        error
        onSave={() => {}}
        onRevert={() => {}}
      />,
    );
    expect(screen.getByTestId('remap-error')).toBeInTheDocument();
  });
});
