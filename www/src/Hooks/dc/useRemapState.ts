import type { MappedButton } from './useControllerMapping';

export type RemapState = {
  originalActions: Record<number, number>;
  workingActions: Record<number, number>;
  dirty: boolean;
};

export function initRemapState(mapping: MappedButton[]): RemapState {
  const actions: Record<number, number> = {};
  for (const m of mapping) actions[m.pin] = m.action;
  return {
    originalActions: { ...actions },
    workingActions: { ...actions },
    dirty: false,
  };
}

function computeDirty(s: RemapState): boolean {
  return Object.keys(s.workingActions).some(
    (pin) => s.workingActions[Number(pin)] !== s.originalActions[Number(pin)],
  );
}

export function assignFunction(
  state: RemapState,
  pin: number,
  action: number,
): RemapState {
  const next: RemapState = {
    ...state,
    workingActions: { ...state.workingActions, [pin]: action },
    dirty: false,
  };
  next.dirty = computeDirty(next);
  return next;
}

export function pendingPins(state: RemapState): number[] {
  return Object.keys(state.workingActions)
    .map(Number)
    .filter((pin) => state.workingActions[pin] !== state.originalActions[pin]);
}
