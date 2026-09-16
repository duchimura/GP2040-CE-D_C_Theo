import { useTranslation } from 'react-i18next';
import type { PinsType } from '../../Store/useProfilesStore';

type Props = {
  profiles: PinsType[];
  selectedIndex: number;
  maxProfiles: number;
  onSelect: (index: number) => void;
  onRename: (label: string) => void;
  onAdd: () => void;
  onToggleEnabled: (index: number) => void;
  onCopyFromBase: () => void;
};

export default function ProfilesBar({
  profiles,
  selectedIndex,
  maxProfiles,
  onSelect,
  onRename,
  onAdd,
  onToggleEnabled,
  onCopyFromBase,
}: Props) {
  const { t } = useTranslation('DC');
  const selected = profiles[selectedIndex];
  const isBase = selectedIndex === 0;
  return (
    <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
      <span className="tw-text-sm tw-font-semibold tw-text-slate-300">
        {t('profiles')}
      </span>
      <div className="tw-inline-flex tw-overflow-hidden tw-rounded tw-border tw-border-slate-600">
        {profiles.map((p, i) => (
          <button
            key={i}
            type="button"
            data-testid={`profile-select-${i}`}
            aria-pressed={i === selectedIndex}
            onClick={() => onSelect(i)}
            className={`tw-px-3 tw-py-1 tw-text-sm ${
              i === selectedIndex
                ? 'tw-bg-sky-600 tw-text-white'
                : 'tw-bg-transparent tw-text-slate-300'
            }`}
          >
            {p.profileLabel || t('profile-n', { n: i + 1 })}
          </button>
        ))}
      </div>
      <input
        data-testid="profile-rename"
        className="tw-w-40 tw-rounded tw-border tw-border-slate-600 tw-bg-slate-800 tw-px-2 tw-py-1 tw-text-sm tw-text-slate-100"
        value={selected?.profileLabel ?? ''}
        placeholder={t('profile-rename')}
        onChange={(e) => onRename(e.target.value)}
      />
      <button
        type="button"
        data-testid="profile-add"
        disabled={profiles.length >= maxProfiles}
        onClick={onAdd}
        className="tw-rounded tw-border tw-border-slate-500 tw-px-2 tw-py-1 tw-text-sm tw-text-slate-200 disabled:tw-opacity-40"
      >
        {t('profile-add')}
      </button>
      <button
        type="button"
        data-testid="profile-copy-base"
        disabled={isBase}
        onClick={onCopyFromBase}
        className="tw-rounded tw-border tw-border-slate-500 tw-px-2 tw-py-1 tw-text-sm tw-text-slate-200 disabled:tw-opacity-40"
      >
        {t('profile-copy-base')}
      </button>
      <label className="tw-flex tw-items-center tw-gap-1 tw-text-sm tw-text-slate-300">
        <input
          type="checkbox"
          data-testid="profile-enable"
          disabled={isBase}
          checked={Boolean(selected?.enabled)}
          onChange={() => onToggleEnabled(selectedIndex)}
        />
        {t('profile-enabled')}
      </label>
    </div>
  );
}
