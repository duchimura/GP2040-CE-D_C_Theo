import { useEffect } from 'react';
import useSystemStats from '../../Store/useSystemStats';

// Compact system-stats panel (the data shown on the stock Home screen), for the
// side of the controller view. Reuses the shared useSystemStats store.
export default function SystemStatsPanel() {
  const {
    currentVersion,
    latestVersion,
    boardConfigProperties,
    memoryReport,
    stats,
    getSystemStats,
  } = useSystemStats();

  useEffect(() => {
    getSystemStats();
  }, [getSystemStats]);

  return (
    <div
      data-testid="system-stats"
      className="tw-w-full lg:tw-w-64 tw-shrink-0 tw-rounded tw-border tw-border-slate-700 tw-bg-slate-800/40 tw-p-4 tw-text-sm tw-text-slate-200"
    >
      <h2 className="tw-mb-2 tw-font-semibold tw-text-slate-100">System Stats</h2>

      <div className="tw-mb-3">
        <div className="tw-font-semibold tw-text-slate-300">Version</div>
        <div>
          {boardConfigProperties.label
            ? `${boardConfigProperties.label} (${boardConfigProperties.fileName}.uf2)`
            : '—'}
        </div>
        <div>Current: {currentVersion || '—'}</div>
        <div>Latest: {latestVersion || '—'}</div>
        {stats.architecture && <div>Architecture: {stats.architecture}</div>}
        {stats.buildType && <div>Build type: {stats.buildType}</div>}
      </div>

      <div>
        <div className="tw-font-semibold tw-text-slate-300">Memory (KB)</div>
        <div>
          Flash: {memoryReport.usedFlash} / {memoryReport.totalFlash} (
          {memoryReport.percentageFlash}%)
        </div>
        <div>
          Heap: {memoryReport.usedHeap} / {memoryReport.totalHeap} (
          {memoryReport.percentageHeap}%)
        </div>
        <div>Static allocations: {memoryReport.staticAllocs}</div>
        <div>Board flash: {memoryReport.physicalFlash}</div>
      </div>
    </div>
  );
}
