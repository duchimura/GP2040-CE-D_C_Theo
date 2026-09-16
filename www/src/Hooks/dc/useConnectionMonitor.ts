import { useEffect } from 'react';
import { useConnectionStore } from '../../Store/useConnectionStore';

/**
 * Actively polls device reachability so the connection banner reflects reality.
 * Calls checkConnection() once on mount and then every `intervalMs`.
 */
export function useConnectionMonitor(intervalMs = 5000): void {
  const checkConnection = useConnectionStore((s) => s.checkConnection);
  useEffect(() => {
    checkConnection();
    const id = setInterval(() => {
      checkConnection();
    }, intervalMs);
    return () => clearInterval(id);
  }, [checkConnection, intervalMs]);
}
