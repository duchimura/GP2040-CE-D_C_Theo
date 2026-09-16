import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../Hooks/dc/useGeneralSettings', () => ({
  loadGeneralSettings: vi.fn().mockResolvedValue({ inputMode: 4, dpadMode: 0, socdMode: 0 }),
  saveGeneralSettings: vi.fn().mockResolvedValue(undefined),
  validateGeneralSettings: vi.fn().mockReturnValue([]),
}));

import { loadGeneralSettings, saveGeneralSettings } from '../../Hooks/dc/useGeneralSettings';
import GeneralSettingsPage from './GeneralSettingsPage';

beforeEach(() => vi.clearAllMocks());

describe('GeneralSettingsPage', () => {
  it('loads current settings on mount', async () => {
    render(<GeneralSettingsPage />);
    await waitFor(() => expect(loadGeneralSettings).toHaveBeenCalled());
    expect((await screen.findByTestId('input-mode')) as HTMLSelectElement).toHaveValue('4');
  });

  it('saves and shows confirmation', async () => {
    render(<GeneralSettingsPage />);
    await screen.findByTestId('input-mode');
    await userEvent.click(screen.getByTestId('save-settings'));
    await waitFor(() => expect(saveGeneralSettings).toHaveBeenCalled());
    expect(await screen.findByTestId('save-status')).toHaveTextContent(/saved/i);
  });
});
