import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { useHeldPinsMonitor } from '../../Hooks/dc/useHeldPinsMonitor';
import { useConnectionStore } from '../../Store/useConnectionStore';

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
  it('retries loading automatically once the connection comes back, with no retry button', async () => {
    // profiles: [] is what a failed/not-yet-connected initial load looks
    // like. There is no manual retry control — reconnecting should be
    // enough, same as how the page just resolves on its own once the
    // controller is actually there.
    view.profiles = [];
    useConnectionStore.setState({ status: 'searching' });
    try {
      render(
        <MemoryRouter initialEntries={['/']}>
          <ControllerViewPage />
        </MemoryRouter>,
      );
      expect(screen.getByTestId('ctrl-waiting')).toBeInTheDocument();
      expect(screen.queryByTestId('ctrl-retry')).not.toBeInTheDocument();

      const callsBeforeReconnect = view.load.mock.calls.length;
      act(() => {
        useConnectionStore.setState({ status: 'connected' });
      });
      await waitFor(() =>
        expect(view.load.mock.calls.length).toBeGreaterThan(callsBeforeReconnect),
      );
    } finally {
      view.profiles = [{ profileLabel: 'P1', enabled: true }];
      useConnectionStore.setState({ status: 'searching' });
    }
  });

  it('loads profiles and renders the controller layout, hiding the profiles bar by default', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ControllerViewPage />
      </MemoryRouter>,
    );
    expect(view.load).toHaveBeenCalled();
    expect(screen.getByTestId('ctrl-btn-B1')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-select-0')).not.toBeInTheDocument();
  });

  it('shows the profiles bar on the pin-mapping route', () => {
    render(
      <MemoryRouter initialEntries={['/pin-mapping']}>
        <ControllerViewPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('profile-select-0')).toBeInTheDocument();
  });

  it('enables remap by default on the pin-mapping route', () => {
    render(
      <MemoryRouter initialEntries={['/pin-mapping']}>
        <ControllerViewPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('fn-B1')).toBeInTheDocument();
    expect(screen.getByTestId('remap-save')).toBeInTheDocument();
  });

  it('does not enable remap by default on the landing page', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ControllerViewPage />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('fn-B1')).not.toBeInTheDocument();
  });

  it('shows system stats on the landing page but hides them on the pin-mapping route', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/']}>
        <ControllerViewPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('system-stats')).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter initialEntries={['/pin-mapping']}>
        <ControllerViewPage />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('system-stats')).not.toBeInTheDocument();
  });

  it('shows the profiles bar once remap mode is entered', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ControllerViewPage />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('profile-select-0')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('remap-toggle'));
    expect(screen.getByTestId('profile-select-0')).toBeInTheDocument();
  });

  it('enables remap when navigating in-app from the landing page to pin-mapping', async () => {
    // Mirrors App.tsx: '/' and '/pin-mapping' are separate <Route> entries that
    // both render <ControllerViewPage />, so React Router reuses the same
    // component instance across that navigation instead of remounting it —
    // a plain re-render with a new `initialEntries` MemoryRouter (as the other
    // tests use) wouldn't exercise that persisted-instance behavior.
    render(
      <MemoryRouter initialEntries={['/']}>
        <Link to="/pin-mapping" data-testid="go-to-pin-mapping" />
        <Routes>
          <Route path="/" element={<ControllerViewPage />} />
          <Route path="/pin-mapping" element={<ControllerViewPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('fn-B1')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('go-to-pin-mapping'));
    expect(screen.getByTestId('fn-B1')).toBeInTheDocument();
  });

  it('lights up a button pressed on the real controller while in remap mode', () => {
    vi.mocked(useHeldPinsMonitor).mockReturnValue([6]); // pin 6 is B1's defaultPin
    render(
      <MemoryRouter initialEntries={['/pin-mapping']}>
        <ControllerViewPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('ctrl-btn-B1')).toHaveAttribute('data-held', 'true');
  });

  it('remaps a button on the selected profile and saves', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ControllerViewPage />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByTestId('remap-toggle'));
    await userEvent.click(screen.getByTestId('fn-B2'));
    await userEvent.click(screen.getByTestId('ctrl-btn-B1'));
    expect(view.assignFunctionToPin).toHaveBeenCalledWith(6, 6); // pin 6 (B1), B2 = action 6
    await userEvent.click(screen.getByTestId('remap-save'));
    await waitFor(() => expect(view.save).toHaveBeenCalled());
  });

  it('remaps a button by dragging its function from the list and dropping it, without needing a click first', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ControllerViewPage />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByTestId('remap-toggle'));
    const dataTransfer = { getData: vi.fn(() => 'B2'), setData: vi.fn(), dropEffect: '' };
    fireEvent.drop(screen.getByTestId('ctrl-btn-B1'), { dataTransfer });
    expect(view.assignFunctionToPin).toHaveBeenCalledWith(6, 6); // pin 6 (B1), B2 = action 6
  });
});
