import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilesBar from './ProfilesBar';

const profiles = [
  { profileLabel: 'P1', enabled: true },
  { profileLabel: 'P2', enabled: false },
] as never[];

function setup(over = {}) {
  const props = {
    profiles,
    selectedIndex: 0,
    maxProfiles: 6,
    onSelect: vi.fn(),
    onRename: vi.fn(),
    onAdd: vi.fn(),
    onToggleEnabled: vi.fn(),
    onCopyFromBase: vi.fn(),
    ...over,
  };
  render(<ProfilesBar {...props} />);
  return props;
}

describe('ProfilesBar', () => {
  it('selects a profile', async () => {
    const p = setup();
    await userEvent.click(screen.getByTestId('profile-select-1'));
    expect(p.onSelect).toHaveBeenCalledWith(1);
  });
  it('adds, copies, and toggles enable', async () => {
    const p = setup({ selectedIndex: 1 });
    await userEvent.click(screen.getByTestId('profile-add'));
    await userEvent.click(screen.getByTestId('profile-copy-base'));
    await userEvent.click(screen.getByTestId('profile-enable'));
    expect(p.onAdd).toHaveBeenCalled();
    expect(p.onCopyFromBase).toHaveBeenCalled();
    expect(p.onToggleEnabled).toHaveBeenCalledWith(1);
  });
});
