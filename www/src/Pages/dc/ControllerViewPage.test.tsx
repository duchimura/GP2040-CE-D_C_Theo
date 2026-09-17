import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const view = {
  profiles: [{ profileLabel: 'P1', enabled: true }],
  selectedIndex: 0,
  setSelectedIndex: vi.fn(),
  loading: false,
  error: false,
  dirty: true,
  maxProfiles: 6,
  // pin 6 is B1's real defaultPin (see Data/dc/layouts.ts) — rendering now
  // resolves placements by their fixed pin, not by the mapping's buttonKey.
  currentMapping: [{ pin: 6, action: 5, buttonKey: 'B1' }],
  snapshotMapping: [{ pin: 6, action: 5, buttonKey: 'B1' }],
  currentActions: { 6: 5 },
  snapshotActions: { 6: 5 },
  assignFunctionToPin: vi.fn(),
  rename: vi.fn(),
  addProfile: vi.fn(),
  toggleEnabled: vi.fn(),
  copyFromBase: vi.fn(),
  load: vi.fn(),
  save: vi.fn().mockResolvedValue(undefined),
  revert: vi.fn(),
};

vi.mock('../../Hooks/dc/useProfilesView', () => ({
  useProfilesView: () => view,
}));
vi.mock('../../Hooks/dc/useHeldPinsMonitor', () => ({
  useHeldPinsMonitor: vi.fn().mockReturnValue([]),
}));
vi.mock('../../Store/useSystemStats', () => ({
  default: () => ({
    currentVersion: '',
    latestVersion: '',
    latestDownloadUrl: '',
    boardConfigProperties: { label: '', fileName: '' },
    memoryReport: {
      percentageFlash: 0,
      percentageHeap: 0,
      physicalFlash: 0,
      staticAllocs: 0,
      totalFlash: 0,
      totalHeap: 0,
      usedFlash: 0,
      usedHeap: 0,
    },
    stats: { architecture: '', build: '', buildType: '' },
    getSystemStats: vi.fn(),
  }),
}));

import ControllerViewPage from './ControllerViewPage';

beforeEach(() => vi.clearAllMocks());

describe('ControllerViewPage', () => {
  it('loads profiles and renders the controller layout + profiles bar', () => {
    render(<ControllerViewPage />);
    expect(view.load).toHaveBeenCalled();
    expect(screen.getByTestId('ctrl-btn-B1')).toBeInTheDocument();
    expect(screen.getByTestId('profile-select-0')).toBeInTheDocument();
  });

  it('remaps a button on the selected profile and saves', async () => {
    render(<ControllerViewPage />);
    await userEvent.click(screen.getByTestId('remap-toggle'));
    await userEvent.click(screen.getByTestId('fn-B2'));
    await userEvent.click(screen.getByTestId('ctrl-btn-B1'));
    expect(view.assignFunctionToPin).toHaveBeenCalledWith(6, 6); // pin 6 (B1), B2 = action 6
    await userEvent.click(screen.getByTestId('remap-save'));
    await waitFor(() => expect(view.save).toHaveBeenCalled());
  });
});
