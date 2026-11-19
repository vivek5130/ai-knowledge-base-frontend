import { useMemo, useState } from 'react';
import { Badge, Button, Card, CardHeader, EmptyState, Icon, Segmented, Skeleton, inputClass } from '../../components/ui';
import { hostOf, timeAgo } from '../../lib/format';
import { EditItemDialog } from './EditItemDialog';
import { IngestForm } from './IngestForm';
import { FLAG_LABELS, SOURCE_TYPES, STRATEGY_LABELS } from './sourceTypes';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'note', label: 'Notes' },
  { value: 'url', label: 'Links' },
  { value: 'doc', label: 'Docs' },
  { value: 'pdf', label: 'PDFs' },
];

/** Add sources on the left; browse, filter, select, edit and delete them on the right. */
export function LibraryView({ items, loading, error, options, onRefresh, onSave, onUpdate, onDelete, onDeleteMany, onSetActive, onReplaceFile }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [editing, setEditing] = useState(null);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        (filter === 'all' || item.source_type === filter) &&
        (!needle || `${item.title ?? ''} ${item.preview} ${item.source_url ?? ''} ${item.file_name ?? ''}`.toLowerCase().includes(needle)),
    );
  }, [items, filter, search]);

  // Drop selections for items that no longer exist (deleted elsewhere / refreshed).
  const selectedIds = items.filter((item) => selected.has(item.id)).map((item) => item.id);
  const allVisibleSelected = visible.length > 0 && visible.every((item) => selected.has(item.id));

  function toggle(id) {
    setConfirmBulk(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setConfirmBulk(false);
    setSelected((prev) => {
      const next = new Set(prev);
      visible.forEach((item) => (allVisibleSelected ? next.delete(item.id) : next.add(item.id)));
      return next;
    });
  }

  async function deleteSelected() {
    setBulkDeleting(true);
    const ok = await onDeleteMany(selectedIds);
    setBulkDeleting(false);
    setConfirmBulk(false);
    if (ok) setSelected(new Set());
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] items-start">
      <Card className="lg:sticky lg:top-20">
        <CardHeader title="Add to knowledge base" subtitle="Notes, links, PDFs and Word docs" icon="plus" />
        <div className="px-5 pb-5">
          <IngestForm onSave={onSave} options={options} />
        </div>
      </Card>

      <section aria-label="Saved items" className="min-w-0">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Icon name="search" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter saved items…"
                aria-label="Filter saved items"
                className={`${inputClass} pl-10 h-10 py-0`}
              />
            </div>
            <Button variant="secondary" size="icon" onClick={onRefresh} aria-label="Refresh" title="Refresh">
              <Icon name="refresh" size={15} className={loading ? 'animate-spin-slow' : ''} />
            </Button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Segmented options={FILTERS} value={filter} onChange={setFilter} label="Item type" size="sm" />
            {visible.length > 0 ? (
              <label className="ml-auto flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
                <Checkbox checked={allVisibleSelected} onChange={toggleAllVisible} label="Select all shown items" />
                Select all
              </label>
            ) : null}
          </div>
        </div>

        {selectedIds.length > 0 ? (
          <div className="sticky top-16 z-10 mb-3 flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 shadow-sm">
            <span className="text-sm font-medium text-fg tabular-nums">{selectedIds.length} selected</span>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
            <div className="ml-auto flex items-center gap-2">
              {confirmBulk ? (
                <>
                  <span className="hidden sm:inline text-xs text-muted">Delete {selectedIds.length} item{selectedIds.length === 1 ? '' : 's'} and their chunks?</span>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmBulk(false)} disabled={bulkDeleting}>Cancel</Button>
                  <Button size="sm" loading={bulkDeleting} onClick={deleteSelected}>Delete</Button>
                </>
              ) : (
                <Button variant="danger" size="sm" onClick={() => setConfirmBulk(true)}>
                  <Icon name="trash" size={13} /> Delete selected
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-fg">
            {error.message}
            {error.requestId ? <span className="block font-mono text-[11px] text-muted">ref {error.requestId}</span> : null}
          </div>
        ) : loading && items.length === 0 ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="p-4 space-y-2.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </Card>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <EmptyState title={items.length ? 'No items match your filter' : 'Your knowledge base is empty'}>
              {items.length ? 'Try a different search or type.' : 'Save a note, paste a URL or upload a PDF / Word doc to get started.'}
            </EmptyState>
          </Card>
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
            {visible.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                selected={selected.has(item.id)}
                onToggle={() => toggle(item.id)}
                onEdit={() => setEditing(item)}
                onDelete={onDelete}
                onSetActive={(value) => onSetActive(item.id, value)}
              />
            ))}
          </ul>
        )}
      </section>

      {editing ? (
        <EditItemDialog
          item={editing}
          options={options}
          onClose={() => setEditing(null)}
          onSave={onUpdate}
          onReplaceFile={onReplaceFile}
        />
      ) : null}
    </div>
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
    />
  );
}

function ItemCard({ item, selected, onToggle, onEdit, onDelete, onSetActive }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const meta = SOURCE_TYPES[item.source_type] ?? SOURCE_TYPES.note;
  const truncated = item.char_count > item.preview.length;

  async function remove() {
    setDeleting(true);
    const ok = await onDelete(item.id);
    if (!ok) {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <li
      className={`group min-w-0 rounded-2xl border bg-surface p-4 transition-colors ${
        selected ? 'border-accent ring-2 ring-accent/15' : 'border-line hover:border-line-strong'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="pt-2.5">
          <Checkbox checked={selected} onChange={onToggle} label={`Select ${item.title || 'item'}`} />
        </div>
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-surface-2 text-muted shrink-0">
          <Icon name={meta.icon} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-fg truncate" title={item.title || 'Untitled'}>{item.title || 'Untitled'}</h3>
          <div className="mt-0.5 flex items-center gap-x-2 gap-y-0.5 text-[11px] text-subtle flex-wrap">
            <span>{meta.label}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={item.updated_at} title={`Created ${timeAgo(item.created_at)}`}>
              {item.updated_at !== item.created_at ? `updated ${timeAgo(item.updated_at)}` : timeAgo(item.created_at)}
            </time>
            {item.source_url ? (
              <>
                <span aria-hidden="true">·</span>
                <a href={item.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-accent-text">
                  {hostOf(item.source_url)} <Icon name="external" size={10} />
                </a>
              </>
            ) : null}
            {item.file_name ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate max-w-48" title={item.file_name}>{item.file_name}</span>
              </>
            ) : null}
          </div>
        </div>

        {confirming ? (
          <div className="flex items-center gap-1">
            <Button variant="danger" size="sm" loading={deleting} onClick={remove}>Delete</Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={deleting}>Cancel</Button>
          </div>
        ) : (
          <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${item.title || 'item'}`} title="Edit & re-index">
              <Icon name="sliders" size={14} />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setConfirming(true)} aria-label={`Delete ${item.title || 'item'}`} title="Delete">
              <Icon name="trash" size={14} />
            </Button>
          </div>
        )}
        <ActiveSwitch active={item.is_active} onChange={onSetActive} label={item.title || 'item'} />
      </div>

      <p className={`mt-3 ml-7 text-[13px] leading-relaxed text-muted whitespace-pre-line line-clamp-3 ${item.is_active ? '' : 'opacity-50'}`}>
        {item.preview}
        {truncated ? '…' : ''}
      </p>

      <div className="mt-3 ml-7 flex items-center gap-1.5 flex-wrap">
        <Badge tone="outline" title="Searchable chunks">{item.chunk_count} chunk{item.chunk_count === 1 ? '' : 's'}</Badge>
        <Badge tone="outline" title="Chunking strategy · size / overlap (characters)">
          {STRATEGY_LABELS[item.chunking.strategy]} · {item.chunking.size}/{item.chunking.overlap}
        </Badge>
        <Badge tone="outline">{item.char_count.toLocaleString()} chars</Badge>
        {(item.flags ?? []).map((flag) => (
          <Badge key={flag} tone="accent" icon="alert" title={FLAG_LABELS[flag]?.detail}>
            {FLAG_LABELS[flag]?.short ?? flag}
          </Badge>
        ))}
        <span className="ml-auto font-mono text-[10px] text-subtle" title={`Content SHA-256: ${item.content_hash}`}>
          #{item.content_hash.slice(0, 8)}
        </span>
      </div>
    </li>
  );
}

/** On = used as context for answers; off = kept in the library but ignored by retrieval. */
function ActiveSwitch({ active, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={`Use ${label} in answers`}
      title={active ? 'Active: used in answers' : 'Inactive: excluded from answers'}
      onClick={() => onChange(!active)}
      className="inline-flex items-center gap-1.5 h-6 pl-1 pr-2 rounded-md border border-line text-[11px] font-medium cursor-pointer hover:border-line-strong"
    >
      <span className={`relative w-6 h-3.5 rounded-full transition-colors ${active ? 'bg-good' : 'bg-line-strong'}`}>
        <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-[left] ${active ? 'left-3' : 'left-0.5'}`} />
      </span>
      <span className={active ? 'text-good-text' : 'text-subtle'}>{active ? 'Active' : 'Inactive'}</span>
    </button>
  );
}
