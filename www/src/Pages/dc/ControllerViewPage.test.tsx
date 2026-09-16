import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../../Hooks/dc/useControllerMapping', () => ({
  loadControllerMapping: vi
    .fn()
    .mockResolvedValue([{ pin: 0, action: 5, buttonKey: 'B1' }]),
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

import { loadControllerMapping } from '../../Hooks/dc/useControllerMapping';
import ControllerViewPage from './ControllerViewPage';

beforeEach(() => vi.clearAllMocks());

describe('ControllerViewPage', () => {
  it('loads the mapping and renders the controller layout', async () => {
    render(<ControllerViewPage />);
    await waitFor(() => expect(loadControllerMapping).toHaveBeenCalled());
    expect(await screen.findByTestId('ctrl-btn-B1')).toBeInTheDocument();
  });
});
