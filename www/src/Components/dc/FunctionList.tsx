import { ASSIGNABLE_FUNCTIONS, type LayoutButtonKey } from '../../Data/dc/gpioActions';

type Props = {
  selected: LayoutButtonKey | null;
  onSelect: (key: LayoutButtonKey) => void;
  labelFor: (key: LayoutButtonKey) => string;
};

export default function FunctionList({ selected, onSelect, labelFor }: Props) {
  return (
    <div className="tw-flex tw-w-24 tw-shrink-0 tw-flex-col tw-gap-1">
      {ASSIGNABLE_FUNCTIONS.map((key) => (
        <button
          key={key}
          type="button"
          data-testid={`fn-${key}`}
          aria-pressed={selected === key}
          onClick={() => onSelect(key)}
          draggable
          onDragStart={(e) => {
            // Plain text, not JSON: this is consumed by drop targets outside
            // React's control (ControllerLayout's native DnD handlers), so
            // keep the payload trivial to read on the other end.
            e.dataTransfer.setData('text/plain', key);
            e.dataTransfer.effectAllowed = 'copy';
          }}
          className={`tw-flex tw-cursor-grab tw-justify-center tw-rounded tw-px-2 tw-py-1 tw-text-center tw-text-sm active:tw-cursor-grabbing ${
            selected === key
              ? 'tw-bg-sky-600 tw-text-white'
              : 'tw-bg-slate-700 tw-text-slate-200'
          }`}
        >
          {labelFor(key)}
        </button>
      ))}
    </div>
  );
}
