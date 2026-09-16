import type { ReactNode } from 'react';
import ControllerViewPage from '../../Pages/dc/ControllerViewPage';

// Stock route path -> our enhanced page, applied only when D_C_Theo mode is ON.
// Extend this map to substitute more stock pages (e.g. '/led-config' later).
export const DC_ROUTE_SUBSTITUTIONS: Record<string, ReactNode> = {
  '/': <ControllerViewPage />,
  '/pin-mapping': <ControllerViewPage />,
};

export function dcElement(
  path: string,
  enabled: boolean,
  stock: ReactNode,
): ReactNode {
  if (enabled && path in DC_ROUTE_SUBSTITUTIONS) {
    return DC_ROUTE_SUBSTITUTIONS[path];
  }
  return stock;
}
