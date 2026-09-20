import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { useHeldPinsMonitor } from '../../Hooks/dc/useHeldPinsMonitor';
import { useConnectionStore } from '../../Store/useConnectionStore';
import { AppContext } from '../../Contexts/AppContext';
import { BUTTON_ACTIONS } from '../../Data/Pins';
import { faceStyleFor } from '../../Data/dc/faceButtons';

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

beforeEach(() => {
  vi.clearAllMocks();
  // Most tests in this file implicitly assume an already-connected board
  // with a known identity (that's what let them render the full layout
  // before this state existed at all). Pico matches the B1=pin 6 assumption
  // already baked into the `view` fixture above (see Data/dc/layouts.ts).
  useConnectionStore.setState({
    status: 'connected',
    controllerName: 'Test Board',
    controllerInfo: {
      version: '',
      boardArchitecture: '',
      boardBuild: '',
      boardBuildType: '',
      boardConfigLabel: 'Pico',
      boardConfigFileName: '',
      boardConfig: 'Pico',
    },
  });
});

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

  it("shows a loading placeholder while the board's identity is still resolving, instead of silently using the Pico-default layout", () => {
    useConnectionStore.setState({
      status: 'searching',
      controllerName: '',
      controllerInfo: null,
    });
    render(
      <MemoryRouter initialEntries={['/']}>
        <ControllerViewPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('ctrl-loading-board')).toBeInTheDocument();
    expect(screen.queryByTestId('ctrl-btn-B1')).not.toBeInTheDocument();

    act(() => {
      useConnectionStore.setState({
        status: 'connected',
        controllerInfo: {
          version: '',
          boardArchitecture: '',
          boardBuild: '',
          boardBuildType: '',
          boardConfigLabel: 'Pico',
          boardConfigFileName: '',
          boardConfig: 'Pico',
        },
      });
    });
    expect(screen.getByTestId('ctrl-btn-B1')).toBeInTheDocument();
    expect(screen.queryByTestId('ctrl-loading-board')).not.toBeInTheDocument();
  });

  it('keeps showing the resolved layout (not the loading placeholder) across a transient disconnect after the board has already resolved once', () => {
    // beforeEach already renders as connected with a known board (Pico), so
    // this starts from an already-resolved identity.
    render(
      <MemoryRouter initialEntries={['/']}>
        <ControllerViewPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('ctrl-btn-B1')).toBeInTheDocument();
    expect(screen.queryByTestId('ctrl-loading-board')).not.toBeInTheDocument();

    // A single failed poll (dropped packet, board busy mid-save) — the
    // connection store clears controllerInfo, not just a cold-start
    // scenario. The board's physical identity can't actually change
    // mid-session, so the page should keep rendering it rather than
    // blanking behind the loading placeholder (ConnectionBanner already
    // surfaces the "lost" state separately).
    act(() => {
      useConnectionStore.setState({ status: 'lost', controllerInfo: null });
    });

    expect(screen.getByTestId('ctrl-btn-B1')).toBeInTheDocument();
    expect(screen.queryByTestId('ctrl-loading-board')).not.toBeInTheDocument();
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

  describe('button labels follow the device input mode', () => {
    const renderPage = (navLabelType?: string) =>
      render(
        <AppContext.Provider
          value={
            (navLabelType
              ? { buttonLabels: { buttonLabelType: navLabelType } }
              : null) as never
          }
        >
          <MemoryRouter initialEntries={['/']}>
            <ControllerViewPage />
          </MemoryRouter>
        </AppContext.Provider>,
      );

    it('uses the label set matching the device input mode', () => {
      useConnectionStore.setState({ inputMode: 4 }); // PS4
      renderPage();
      expect(screen.getByTestId('ctrl-btn-B1')).toHaveTextContent('Cross');
    });

    it('lets the device input mode win over the nav label dropdown', () => {
      useConnectionStore.setState({ inputMode: 4 }); // PS4
      renderPage('switch');
      expect(screen.getByTestId('ctrl-btn-B1')).toHaveTextContent('Cross');
    });

    it('falls back to the nav label dropdown when the mode has no label set', () => {
      useConnectionStore.setState({ inputMode: 3 }); // Keyboard
      renderPage('ps4');
      expect(screen.getByTestId('ctrl-btn-B1')).toHaveTextContent('Cross');
    });

    it('falls back to the nav label dropdown when the input mode is unknown', () => {
      useConnectionStore.setState({ inputMode: null });
      renderPage('switch');
      expect(screen.getByTestId('ctrl-btn-B1')).toHaveTextContent('B');
      expect(screen.getByTestId('ctrl-btn-B1')).not.toHaveTextContent('B1');
    });
  });

  it('offers the console (input mode) dropdown in the toolbar', () => {
    useConnectionStore.setState({ inputMode: 4 });
    render(
      <MemoryRouter initialEntries={['/']}>
        <ControllerViewPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('combobox', { name: /input mode/i })).toHaveValue('4');
  });

  it("shows PS4's touchpad button as 'TPad' so it fits its circle", () => {
    const a2 = BUTTON_ACTIONS.BUTTON_PRESS_A2;
    const saved = {
      currentMapping: view.currentMapping,
      snapshotMapping: view.snapshotMapping,
      currentActions: view.currentActions,
      snapshotActions: view.snapshotActions,
    };
    Object.assign(view, {
      currentMapping: [...saved.currentMapping, { pin: 21, action: a2, buttonKey: 'A2' }],
      snapshotMapping: [...saved.snapshotMapping, { pin: 21, action: a2, buttonKey: 'A2' }],
      currentActions: { ...saved.currentActions, 21: a2 },
      snapshotActions: { ...saved.snapshotActions, 21: a2 },
    });
    try {
      useConnectionStore.setState({ inputMode: 4 }); // PS4: A2 = 'Touchpad Center'
      render(
        <MemoryRouter initialEntries={['/']}>
          <ControllerViewPage />
        </MemoryRouter>,
      );
      const extra = screen.getByTestId('ctrl-btn-extra-21');
      expect(extra).toHaveTextContent('TPad');
      expect(extra).not.toHaveTextContent('Touchpad');
    } finally {
      Object.assign(view, saved);
    }
  });

  describe('face-button styling follows the device console', () => {
    const b1 = () => screen.getByTestId('ctrl-btn-B1');
    // An earlier test leaves pin 6 (B1) held via mockReturnValue, which
    // clearAllMocks doesn't reset — a held button is drawn dark, not in color.
    beforeEach(() => {
      vi.mocked(useHeldPinsMonitor).mockReturnValue([]);
    });
    const renderPage = () =>
      render(
        <MemoryRouter initialEntries={['/']}>
          <ControllerViewPage />
        </MemoryRouter>,
      );

    it('draws PlayStation shapes for PS4', () => {
      useConnectionStore.setState({ inputMode: 4 });
      renderPage();
      expect(b1().querySelector('[data-shape="cross"]')).not.toBeNull();
      expect(
        screen.getByTestId('ctrl-btn-B4').querySelector('[data-shape="triangle"]'),
      ).not.toBeNull();
    });

    it('colors the Xbox letters for XInput', () => {
      useConnectionStore.setState({ inputMode: 0 });
      renderPage();
      expect(b1().querySelector('[data-shape]')).toBeNull();
      expect(b1().querySelector('text')?.getAttribute('fill')).toBe(
        faceStyleFor('xinput', 'B1')?.color,
      );
    });

    it('leaves Switch as plain text', () => {
      useConnectionStore.setState({ inputMode: 1 });
      renderPage();
      expect(b1().querySelector('[data-shape]')).toBeNull();
      expect(b1()).toHaveTextContent('B');
    });
  });
});
