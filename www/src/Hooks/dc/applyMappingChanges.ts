// @ts-expect-error - WebApi.js is untyped JS
import WebApi from '../../Services/WebApi';

type RawMapping = Record<string, unknown>;
type PinEntry = { action: number; [k: string]: unknown };

export function applyMappingChanges(
  raw: RawMapping,
  workingActions: Record<number, number>,
): RawMapping {
  const copy: RawMapping = structuredClone(raw);
  for (const [pinStr, action] of Object.entries(workingActions)) {
    const key = `pin${String(pinStr).padStart(2, '0')}`;
    const entry = copy[key] as PinEntry | undefined;
    if (entry && typeof entry === 'object') entry.action = action;
  }
  return copy;
}

type MappingApi = {
  getPinMappings: () => Promise<RawMapping>;
  setPinMappings: (mappings: RawMapping) => Promise<unknown>;
};

const defaultApi: MappingApi = {
  getPinMappings: WebApi.getPinMappings,
  setPinMappings: WebApi.setPinMappings,
};

export async function saveRemap(
  workingActions: Record<number, number>,
  api: MappingApi = defaultApi,
): Promise<void> {
  const raw = await api.getPinMappings();
  const updated = applyMappingChanges(raw, workingActions);
  await api.setPinMappings(updated);
}
