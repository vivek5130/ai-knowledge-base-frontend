import { useId, useState } from 'react';
import { Icon, Segmented } from '../../components/ui';
import { STRATEGY_LABELS, chunkingError } from './sourceTypes';

/**
 * Collapsible "Chunking" section: strategy, chunk size and overlap.
 * `textLength` (optional) shows a rough chunk-count estimate.
 */
export function ChunkingFields({ value, onChange, options, textLength, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const error = chunkingError(value, options);
  const [min, max] = options.size_range;
  const overlapMax = Math.min(options.overlap_max, Math.floor(value.size / 2));
  const estimate = textLength && !error ? Math.max(1, Math.ceil((textLength - value.overlap) / (value.size - value.overlap))) : null;
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="rounded-xl border border-line">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={id}
        className="w-full flex items-center gap-2 px-3.5 h-10 text-left cursor-pointer"
      >
        <Icon name="sliders" size={14} className="text-subtle" />
        <span className="text-xs font-medium text-fg">Chunking</span>
        <span className={`ml-auto text-[11px] font-mono ${error ? 'text-accent-text' : 'text-subtle'}`}>
          {STRATEGY_LABELS[value.strategy]} · {value.size} / {value.overlap}
        </span>
        <Icon name="chevron" size={14} className={`text-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div id={id} className="px-3.5 pb-3.5 pt-1 flex flex-col gap-3.5 border-t border-line">
          <div className="pt-2.5">
            <Segmented
              size="sm"
              label="Chunking strategy"
              value={value.strategy}
              onChange={(strategy) => set({ strategy })}
              options={Object.keys(options.strategies).map((key) => ({ value: key, label: STRATEGY_LABELS[key] ?? key }))}
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-subtle">{options.strategies[value.strategy]}</p>
          </div>

          <RangeField
            label="Chunk size"
            unit="chars"
            value={value.size}
            min={min}
            max={max}
            step={50}
            onChange={(size) => set({ size, overlap: Math.min(value.overlap, Math.floor(size / 2)) })}
          />
          <RangeField
            label="Overlap"
            unit="chars"
            value={value.overlap}
            min={0}
            max={overlapMax}
            step={10}
            onChange={(overlap) => set({ overlap })}
          />

          <p className={`text-[11px] ${error ? 'text-accent-text' : 'text-subtle'}`}>
            {error ?? (estimate ? `≈ ${estimate} chunk${estimate === 1 ? '' : 's'} for this text` : 'Overlap repeats the end of each chunk at the start of the next.')}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function RangeField({ label, unit, value, min, max, step, onChange }) {
  const id = useId();
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-xs text-muted">{label}</label>
        <span className="flex items-center gap-1">
          <input
            type="number"
            value={Number.isFinite(value) ? value : ''}
            min={min}
            max={max}
            step={step}
            aria-label={`${label} (${unit})`}
            onChange={(event) => onChange(event.target.value === '' ? NaN : Number(event.target.value))}
            className="w-20 h-7 rounded-md border border-line bg-surface px-2 text-right text-xs font-mono text-fg focus:outline-none focus:border-accent"
          />
          <span className="text-[11px] text-subtle">{unit}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={Math.max(max, min)}
        step={step}
        value={Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[var(--accent)] cursor-pointer"
      />
    </div>
  );
}
