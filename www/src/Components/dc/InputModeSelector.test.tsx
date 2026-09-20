import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../Hooks/dc/saveInputMode', () => ({
  saveInputMode: vi.fn().mockResolvedValue(undefined),
}));

import { saveInputMode } from '../../Hooks/dc/saveInputMode';
import { useConnectionStore } from '../../Store/useConnectionStore';
import InputModeSelector from './InputModeSelector';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(saveInputMode).mockResolvedValue(undefined);
  useConnectionStore.setState({ inputMode: 4 });
});

describe('InputModeSelector', () => {
  it('shows the device input mode', () => {
    render(<InputModeSelector />);
    expect(screen.getByRole('combobox', { name: /input mode/i })).toHaveValue('4');
  });

  it('is disabled until the input mode is known', () => {
    useConnectionStore.setState({ inputMode: null });
    render(<InputModeSelector />);
    expect(screen.getByRole('combobox', { name: /input mode/i })).toBeDisabled();
  });

  it('saves immediately on change and updates the store', async () => {
    render(<InputModeSelector />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /input mode/i }), '1');
    expect(saveInputMode).toHaveBeenCalledWith(1);
    expect(useConnectionStore.getState().inputMode).toBe(1);
    expect(await screen.findByRole('status')).toHaveTextContent(/reboot/i);
  });

  it('reports a failed save and keeps the previous mode', async () => {
    vi.mocked(saveInputMode).mockRejectedValue(new Error('nope'));
    render(<InputModeSelector />);
    const select = screen.getByRole('combobox', { name: /input mode/i });
    await userEvent.selectOptions(select, '1');
    expect(await screen.findByRole('status')).toHaveTextContent(/failed/i);
    expect(useConnectionStore.getState().inputMode).toBe(4);
    expect(select).toHaveValue('4');
  });

  it('stays enabled while saving so keyboard stepping keeps focus', async () => {
    let release: () => void = () => {};
    vi.mocked(saveInputMode).mockReturnValue(new Promise<void>((r) => (release = r)));
    render(<InputModeSelector />);
    const select = screen.getByRole('combobox', { name: /input mode/i });
    await userEvent.selectOptions(select, '1');
    expect(select).toBeEnabled();
    release();
    await screen.findByRole('status');
  });

  it('saves overlapping changes one at a time, in order', async () => {
    const releases: Array<() => void> = [];
    vi.mocked(saveInputMode).mockImplementation(
      () => new Promise<void>((r) => releases.push(r)),
    );
    render(<InputModeSelector />);
    const select = screen.getByRole('combobox', { name: /input mode/i });
    await userEvent.selectOptions(select, '1');
    await userEvent.selectOptions(select, '2');
    // The second save must not start until the first has finished.
    expect(saveInputMode).toHaveBeenCalledTimes(1);
    releases[0]();
    await waitFor(() => expect(saveInputMode).toHaveBeenCalledTimes(2));
    expect(vi.mocked(saveInputMode).mock.calls.map((c) => c[0])).toEqual([1, 2]);
    releases[1]();
    await waitFor(() => expect(useConnectionStore.getState().inputMode).toBe(2));
  });

  it('shows the picked mode immediately, before the save finishes', async () => {
    vi.mocked(saveInputMode).mockReturnValue(new Promise<void>(() => {}));
    render(<InputModeSelector />);
    const select = screen.getByRole('combobox', { name: /input mode/i });
    await userEvent.selectOptions(select, '1');
    expect(select).toHaveValue('1');
    // The device value hasn't changed yet; the pick must not snap back to it.
    expect(useConnectionStore.getState().inputMode).toBe(4);
  });
});
