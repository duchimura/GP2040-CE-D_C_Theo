// @ts-expect-error - WebApi.js is untyped JS
import WebApi from '../../Services/WebApi';
import { buttonKeyForAction, type LayoutButtonKey } from '../../Data/dc/gpioActions';

export type MappedButton = { pin: number; action: number; buttonKey: LayoutButtonKey };

type MappingApi = {
  getPinMappings: () => Promise<Record<string, { action: number } | unknown>>;
};

const defaultApi: MappingApi = { getPinMappings: WebApi.getPinMappings };

export async function loadControllerMapping(
  api: MappingApi = defaultApi,
): Promise<MappedButton[]> {
  const data = await api.getPinMappings();
  const result: MappedButton[] = [];
  for (const [key, value] of Object.entries(data ?? {})) {
    const match = /^pin(\d+)$/.exec(key);
    if (!match) continue;
    const action = (value as { action?: number })?.action;
    if (typeof action !== 'number') continue;
    const buttonKey = buttonKeyForAction(action);
    if (!buttonKey) continue;
    result.push({ pin: Number(match[1]), action, buttonKey });
  }
  return result;
}
