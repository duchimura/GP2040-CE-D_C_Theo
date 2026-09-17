import { useCallback, useMemo, useState } from 'react';
import useProfilesStore, {
  MAX_PROFILES,
  type PinsType,
} from '../../Store/useProfilesStore';
import { profileToMappedButtons, actionsByPin } from '../../Data/dc/profileMapping';

const pinKey = (pin: number) => `pin${String(pin).padStart(2, '0')}`;

// The real board's httpd has a small, finite connection pool and has been
// observed to go fully unresponsive (no reply, no connection error) rather
// than fail cleanly — fetchProfiles' underlying requests carry no timeout of
// their own, so without a bound here a wedged board leaves the UI stuck on
// "waiting for controller" forever with no way to tell the user or retry.
// This only gives up client-side (nothing is aborted): if the request does
// eventually come back, the store still picks it up normally.
export const PROFILE_LOAD_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(new Error('Timed out waiting for the controller')),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (err) => {
        clearTimeout(timeoutId);
        reject(err);
      },
    );
  });
}

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
      // fetchProfiles is typed `() => void` in useProfilesStore (stock),
      // though it's actually async — Promise.resolve(...) both satisfies
      // withTimeout's Promise<T> parameter and correctly flattens the real
      // promise at runtime.
      await withTimeout(Promise.resolve(fetchProfiles()), PROFILE_LOAD_TIMEOUT_MS);
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
      await withTimeout(Promise.resolve(fetchProfiles()), PROFILE_LOAD_TIMEOUT_MS);
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
