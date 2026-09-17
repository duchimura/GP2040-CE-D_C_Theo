import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useConnectionStore } from '../../Store/useConnectionStore';
import ConnectionBanner from './ConnectionBanner';

beforeEach(() =>
  useConnectionStore.setState({ status: 'searching', controllerName: '' }),
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
});
