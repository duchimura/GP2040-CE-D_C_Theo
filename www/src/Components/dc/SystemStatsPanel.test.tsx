import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const getSystemStats = vi.fn();
vi.mock('../../Store/useSystemStats', () => ({
  default: () => ({
    currentVersion: 'v0.7.12',
    latestVersion: 'v0.7.12',
    latestDownloadUrl: '',
    boardConfigProperties: { label: 'Pico', fileName: 'GP2040_Pico' },
    memoryReport: {
      percentageFlash: 51,
      percentageHeap: 51,
      physicalFlash: 2048,
      staticAllocs: 0.2,
      totalFlash: 2048,
      totalHeap: 2048,
      usedFlash: 1048,
      usedHeap: 1048,
    },
    stats: { architecture: 'RP2040', build: '', buildType: '' },
    getSystemStats,
  }),
}));

import SystemStatsPanel from './SystemStatsPanel';

describe('SystemStatsPanel', () => {
  it('renders version and memory data and requests stats on mount', () => {
    render(<SystemStatsPanel />);
    expect(getSystemStats).toHaveBeenCalled();
    expect(screen.getByTestId('system-stats')).toHaveTextContent('System Stats');
    expect(screen.getByText(/Pico \(GP2040_Pico\.uf2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Flash: 1048 \/ 2048 \(51%\)/)).toBeInTheDocument();
  });
});
