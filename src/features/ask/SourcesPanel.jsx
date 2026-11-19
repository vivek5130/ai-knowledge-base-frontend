import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/ui';
import { formatScore, hostOf } from '../../lib/format';
import { SOURCE_TYPES } from '../library/sourceTypes';

/**
 * ChatGPT-style sources: a compact "N sources" pill that expands into a list.
 * Each row is collapsed to title + origin; clicking it reveals the full passage.
 * `focus` = {n, nonce} from a citation click: opens the panel and expands that source.
 */
export function SourcesPanel({ sources, citations, focus, label = 'Sources', muted = false }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const [flash, setFlash] = useState(null);
  const [seenNonce, setSeenNonce] = useState(null);
  const listRef = useRef(null);

  // A new citation click: open the panel and expand that source (state adjusted during render,
  // the React-recommended way to respond to a changed prop).
  if (focus && focus.nonce !== seenNonce) {
    setSeenNonce(focus.nonce);
    setOpen(true);
    setExpanded((prev) => new Set(prev).add(focus.n));
    setFlash(focus.n);
  }

  // Side effects only: scroll to the row, then fade the highlight.
  useEffect(() => {
    if (!focus) return undefined;
    requestAnimationFrame(() =>
      listRef.current?.querySelector(`[data-n="${focus.n}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
    );
    const timer = setTimeout(() => setFlash(null), 1800);
    return () => clearTimeout(timer);
  }, [focus]);

  if (!sources.length) return null;
  const toggleRow = (n) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  const icons = [...new Set(sources.map((source) => source.source_type ?? 'note'))].slice(0, 3);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`inline-flex items-center gap-2 h-8 pl-1.5 pr-3 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
          open ? 'border-line-strong bg-surface-2 text-fg' : 'border-line bg-surface text-muted hover:text-fg hover:border-line-strong'
        }`}
      >
        <span className="flex -space-x-1.5">
          {icons.map((type) => (
            <span key={type} className="grid place-items-center w-5 h-5 rounded-full bg-surface-2 border border-surface text-muted">
              <Icon name={SOURCE_TYPES[type]?.icon ?? 'note'} size={11} />
            </span>
          ))}
        </span>
        {label} · {sources.length}
        <Icon name="chevron" size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <ol ref={listRef} className={`mt-2 rounded-xl border border-line bg-surface divide-y divide-line overflow-hidden ${muted ? 'opacity-80' : ''}`}>
          {sources.map((source, index) => {
            const n = index + 1;
            const isOpen = expanded.has(n);
            const cited = citations.includes(n);
            const meta = SOURCE_TYPES[source.source_type] ?? SOURCE_TYPES.note;
            const origin = source.source_url ? hostOf(source.source_url) : source.file_name ?? meta.label;
            return (
              <li key={source.chunk_id} data-n={n} className={`scroll-mt-20 transition-colors ${flash === n ? 'bg-accent-soft' : ''}`}>
                <button
                  type="button"
                  onClick={() => toggleRow(n)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-surface-2/60 cursor-pointer"
                >
                  <span
                    className={`grid place-items-center w-5 h-5 rounded-md text-[11px] font-semibold shrink-0 ${
                      cited ? 'bg-accent text-white' : 'bg-surface-2 text-muted'
                    }`}
                    title={cited ? 'Cited in the answer' : 'Retrieved, not cited'}
                  >
                    {n}
                  </span>
                  <Icon name={meta.icon} size={14} className="text-subtle" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-fg truncate">{source.title || origin}</span>
                    {!isOpen ? <span className="block text-[11px] text-subtle truncate">{source.text}</span> : null}
                  </span>
                  <span className="hidden sm:inline text-[11px] text-subtle truncate max-w-36">{origin}</span>
                  <span className="font-mono text-[10px] tabular-nums text-subtle" title="Cosine similarity">
                    {formatScore(source.score)}
                  </span>
                  <Icon name="chevron" size={13} className={`text-subtle transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen ? (
                  <div className="px-3.5 pb-3.5 pl-[3.25rem]">
                    <p className="text-[13px] leading-relaxed text-muted whitespace-pre-wrap">{source.text}</p>
                    {source.source_url ? (
                      <a
                        href={source.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-accent-text hover:underline"
                      >
                        Open page <Icon name="external" size={11} />
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
