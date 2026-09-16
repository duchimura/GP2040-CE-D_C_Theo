import { useCallback, useMemo, useState } from 'react';
import useProfilesStore, {
  MAX_PROFILES,
  type PinsType,
} from '../../Store/useProfilesStore';
import { profileToMappedButtons, actionsByPin } from '../../Data/dc/profileMapping';

const pinKey = (pin: number) => `pin${String(pin).padStart(2, '0')}`;

export function useProfilesView() {
  const profiles = useProfilesStore((s) => s.profiles);
  const loading = useProfilesStore((s) => s.loadingProfiles);
  const fetchProfiles = useProfilesStore((s) => s.fetchProfiles);
  const saveProfiles = useProfilesStore((s) => s.saveProfiles);
  const setProfilePin = useProfilesStore((s) => s.setProfilePin);
  const setProfileLabel = useProfilesStore((s) => s.setProfileLabel);
  const addProfileAction = useProfilesStore((s) => s.addProfile);
  const toggleProfileEnabled = useProfilesStore((s) => s.toggleProfileEnabled);
  const copyBaseProfile = useProfilesStore((s) => s.copyBaseProfile);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapshot, setSnapshot] = useState<PinsType[]>([]);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(false);

  const takeSnapshot = useCallback(() => {
    const ps = useProfilesStore.getState().profiles;
    setSnapshot(structuredClone(ps));
    setDirty(false);
  }, []);

  const load = useCallback(async () => {
    setError(false);
    try {
      await fetchProfiles();
      takeSnapshot();
    } catch {
      setError(true);
    }
  }, [fetchProfiles, takeSnapshot]);

  const save = useCallback(async () => {
    setError(false);
    try {
      await saveProfiles();
      takeSnapshot();
    } catch {
      setError(true);
    }
  }, [saveProfiles, takeSnapshot]);

  const revert = useCallback(async () => {
    setError(false);
    try {
      await fetchProfiles();
      takeSnapshot();
    } catch {
      setError(true);
    }
  }, [fetchProfiles, takeSnapshot]);

  const clampIndex = (i: number) =>
    Math.max(0, Math.min(i, profiles.length - 1));
  const idx = clampIndex(selectedIndex);
  const current = profiles[idx];
  const snap = snapshot[idx];

  const currentMapping = useMemo(
    () => (current ? profileToMappedButtons(current) : []),
    [current],
  );
  const snapshotMapping = useMemo(
    () => (snap ? profileToMappedButtons(snap) : currentMapping),
    [snap, currentMapping],
  );
  const currentActions = useMemo(
    () => (current ? actionsByPin(current) : {}),
    [current],
  );
  const snapshotActions = useMemo(
    () => (snap ? actionsByPin(snap) : currentActions),
    [snap, currentActions],
  );

  const assignFunctionToPin = (pin: number, action: number) => {
    setProfilePin(idx, pinKey(pin), {
      action,
      customButtonMask: 0,
      customDpadMask: 0,
    });
    setDirty(true);
  };
  const rename = (label: string) => {
    setProfileLabel(idx, label);
    setDirty(true);
  };
  const addProfile = () => {
    addProfileAction();
    setDirty(true);
  };
  const toggleEnabled = (index: number) => {
    toggleProfileEnabled(index);
    setDirty(true);
  };
  const copyFromBase = () => {
    copyBaseProfile(idx);
    setDirty(true);
  };

  return {
    profiles,
    selectedIndex: idx,
    setSelectedIndex,
    loading,
    error,
    dirty,
    maxProfiles: MAX_PROFILES,
    currentMapping,
    snapshotMapping,
    currentActions,
    snapshotActions,
    assignFunctionToPin,
    rename,
    addProfile,
    toggleEnabled,
    copyFromBase,
    load,
    save,
    revert,
  };
}
