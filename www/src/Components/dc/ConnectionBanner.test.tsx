import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useConnectionStore } from '../../Store/useConnectionStore';
import ConnectionBanner from './ConnectionBanner';

beforeEach(() =>
  useConnectionStore.setState({
    status: 'searching',
    controllerName: '',
    controllerInfo: null,
  }),
);

describe('ConnectionBanner', () => {
  it('shows searching message', () => {
    useConnectionStore.setState({ status: 'searching' });
    render(<ConnectionBanner />);
    expect(screen.getByTestId('connection-banner')).toHaveAttribute(
      'data-status',
      'searching',
    );
    expect(screen.getByText(/searching for your controller/i)).toBeInTheDocument();
  });

  it('shows lost message with recovery guidance', () => {
    useConnectionStore.setState({ status: 'lost' });
    render(<ConnectionBanner />);
    expect(screen.getByTestId('connection-banner')).toHaveAttribute(
      'data-status',
      'lost',
    );
    expect(screen.getByText(/192\.168\.7\.1/)).toBeInTheDocument();
  });

  it('shows connected message', () => {
    useConnectionStore.setState({ status: 'connected' });
    render(<ConnectionBanner />);
    expect(screen.getByText(/controller connected/i)).toBeInTheDocument();
  });

  it('shows the controller name when known', () => {
    useConnectionStore.setState({ status: 'connected', controllerName: 'Pico' });
    render(<ConnectionBanner />);
    expect(screen.getByText(/controller connected: pico/i)).toBeInTheDocument();
  });

  it('shows the full controller description when known', () => {
    useConnectionStore.setState({
      status: 'connected',
      controllerName: 'Granola Arcade',
      controllerInfo: {
        version: 'v0.7.12',
        boardArchitecture: 'rp2040',
        boardBuild: '0014e4a',
        boardBuildType: 'Release',
        boardConfigLabel: 'Granola Arcade',
        boardConfigFileName: 'GP2040-CE_0.7.12_Granola',
        boardConfig: 'Granola',
      },
    });
    render(<ConnectionBanner />);
    const banner = screen.getByTestId('connection-banner');
    expect(banner).toHaveTextContent('Granola Arcade');
    expect(banner).toHaveTextContent('v0.7.12');
    expect(banner).toHaveTextContent('rp2040');
    expect(banner).toHaveTextContent('Release');
    expect(banner).toHaveTextContent('0014e4a');
    expect(banner).toHaveTextContent('GP2040-CE_0.7.12_Granola');

    // Everything after the "Connected Controller :" prefix is bold, prefix itself is not.
    const bold = banner.querySelector('strong');
    expect(bold).not.toBeNull();
    expect(bold).toHaveTextContent('Granola Arcade');
    expect(bold).toHaveTextContent('v0.7.12');
    expect(banner.textContent?.startsWith('Connected Controller :')).toBe(true);
    expect(bold?.textContent?.includes('Connected Controller')).toBe(false);
  });

  it('omits empty fields instead of leaving stray punctuation, matching real firmware that has no architecture/buildType/build', () => {
    // getFirmwareVersion on real hardware has been observed to omit
    // boardArchitecture/boardBuild/boardBuildType entirely — useConnectionStore
    // defaults those to '', which previously rendered as "(, ) · build ·".
    useConnectionStore.setState({
      status: 'connected',
      controllerName: 'picoPET',
      controllerInfo: {
        version: 'v0.7.11-32-g56f8096-dirty',
        boardArchitecture: '',
        boardBuild: '',
        boardBuildType: '',
        boardConfigLabel: 'picoPET',
        boardConfigFileName: 'GP2040-CE_0.7.11_picoPET',
        boardConfig: 'picoPET',
      },
    });
    render(<ConnectionBanner />);
    const bold = screen.getByTestId('connection-banner').querySelector('strong');
    expect(bold?.textContent).toBe(
      'picoPET — GP2040-CE v0.7.11-32-g56f8096-dirty · GP2040-CE_0.7.11_picoPET',
    );
  });
});
