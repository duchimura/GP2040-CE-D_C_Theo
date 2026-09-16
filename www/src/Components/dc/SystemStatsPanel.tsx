import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useSystemStats from '../../Store/useSystemStats';

// Compact system-stats panel (the data shown on the stock Home screen), for the
// side of the controller view. Reuses the shared useSystemStats store.
export default function SystemStatsPanel() {
  const { t } = useTranslation('DC');
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
      <h2 className="tw-mb-2 tw-font-semibold tw-text-slate-100">
        {t('system-stats-header')}
      </h2>

      <div className="tw-mb-3">
        <div className="tw-font-semibold tw-text-slate-300">{t('version')}</div>
        <div>
          {boardConfigProperties.label
            ? t('version-value', {
                label: boardConfigProperties.label,
                file: boardConfigProperties.fileName,
              })
            : t('none')}
        </div>
        <div>{t('current', { version: currentVersion || t('none') })}</div>
        <div>{t('latest', { version: latestVersion || t('none') })}</div>
        {stats.architecture && (
          <div>{t('architecture', { value: stats.architecture })}</div>
        )}
        {stats.buildType && (
          <div>{t('build-type', { value: stats.buildType })}</div>
        )}
      </div>

      <div>
        <div className="tw-font-semibold tw-text-slate-300">
          {t('memory-header')}
        </div>
        <div>
          {t('memory-flash', {
            used: memoryReport.usedFlash,
            total: memoryReport.totalFlash,
            pct: memoryReport.percentageFlash,
          })}
        </div>
        <div>
          {t('memory-heap', {
            used: memoryReport.usedHeap,
            total: memoryReport.totalHeap,
            pct: memoryReport.percentageHeap,
          })}
        </div>
        <div>{t('memory-static', { value: memoryReport.staticAllocs })}</div>
        <div>{t('memory-board', { value: memoryReport.physicalFlash })}</div>
      </div>
    </div>
  );
}
