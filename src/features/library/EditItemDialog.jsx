import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { Badge, Button, Icon, Skeleton, inputClass } from '../../components/ui';
import { ChunkingFields } from './ChunkingFields';
import { SOURCE_TYPES, chunkingError } from './sourceTypes';

/**
 * Edit / re-index one item. Notes can change text; URLs can be refetched; any item can be
 * re-chunked. The backend re-embeds only chunks whose hash changed and reports what it did.
 */
export function EditItemDialog({ item, options, onClose, onSave, onReplaceFile }) {
  const [detail, setDetail] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [title, setTitle] = useState(item.title ?? '');
  const [content, setContent] = useState('');
  const [chunking, setChunking] = useState(item.chunking);
  const [refetch, setRefetch] = useState(false);
  const [newFile, setNewFile] = useState(null);
  const isDocument = item.source_type === 'doc' || item.source_type === 'pdf';
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const firstField = useRef(null);
  const isNote = item.source_type === 'note';

  useEffect(() => {
    let active = true;
    api
      .getItem(item.id)
      .then((data) => {
        if (!active) return;
        setDetail(data);
        setContent(data.content);
      })
      .catch((err) => active && setLoadError(err));
    firstField.current?.focus();
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      active = false;
      window.removeEventListener('keydown', onKey);
    };
  }, [item.id, onClose]);

  async function submit(event) {
    event.preventDefault();
    if (saving || chunkingError(chunking, options)) return;
    setSaving(true);
    setError(null);
    const chunkingChanged = JSON.stringify(chunking) !== JSON.stringify(item.chunking);
    if (newFile) {
      // New document version: same item, hash diff decides which chunks to re-embed.
      const replaceError = await onReplaceFile(item.id, newFile, chunkingChanged ? chunking : undefined);
      if (replaceError) {
        setSaving(false);
        setError(replaceError);
        return;
      }
      if (title.trim() === (item.title ?? '')) {
        setSaving(false);
        onClose();
        return;
      }
    }
    const payload = {};
    if (title.trim() !== (item.title ?? '')) payload.title = title.trim();
    if (isNote && detail && content.trim() !== detail.content) payload.content = content.trim();
    if (chunkingChanged && !newFile) payload.chunking = chunking;
    if (refetch) payload.refetch = true;
    const err = await onSave(item.id, payload);
    setSaving(false);
    if (err) setError(err);
    else onClose();
  }

  const meta = SOURCE_TYPES[item.source_type];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-title"
        onSubmit={submit}
        className="relative w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-line bg-surface shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 px-5 h-14 border-b border-line bg-surface">
          <Icon name={meta.icon} size={16} className="text-muted" />
          <h2 id="edit-title" className="text-sm font-semibold text-fg truncate flex-1">Edit & re-index</h2>
          <Badge tone="outline">{meta.label}</Badge>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <Icon name="x" size={15} />
          </Button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label htmlFor="edit-item-title" className="block text-xs font-medium text-muted mb-1.5">Title</label>
            <input
              id="edit-item-title"
              ref={firstField}
              value={title}
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <p className="text-xs font-medium text-muted mb-1.5">
              {isNote ? 'Note' : 'Extracted text'}
              {!isNote ? <span className="font-normal text-subtle"> (read-only)</span> : null}
            </p>
            {loadError ? (
              <p className="text-xs text-accent-text">{loadError.message}</p>
            ) : !detail ? (
              <Skeleton className="h-36 w-full rounded-xl" />
            ) : (
              <textarea
                value={content}
                readOnly={!isNote}
                rows={8}
                maxLength={isNote ? 20000 : undefined}
                onChange={(event) => setContent(event.target.value)}
                aria-label={isNote ? 'Note text' : 'Extracted text'}
                className={`${inputClass} resize-y leading-relaxed ${isNote ? '' : 'text-muted bg-surface-2'}`}
              />
            )}
          </div>

          {isDocument ? (
            <div className="rounded-xl border border-line px-3.5 py-3">
              <p className="text-xs font-medium text-fg">Replace file</p>
              <p className="text-[11px] text-subtle">
                Upload a new version of {item.file_name ?? 'this file'}. Unchanged parts keep their embeddings.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-line text-xs font-medium text-fg hover:bg-surface-2 cursor-pointer">
                  <Icon name="upload" size={13} /> Choose file
                  <input
                    type="file"
                    accept={options.file_types.join(',')}
                    className="sr-only"
                    onChange={(event) => setNewFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <span className="text-xs text-muted truncate">{newFile ? newFile.name : 'No file chosen'}</span>
                {newFile ? (
                  <Button variant="ghost" size="icon-sm" onClick={() => setNewFile(null)} aria-label="Clear chosen file">
                    <Icon name="x" size={13} />
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {item.source_type === 'url' ? (
            <label className="flex items-start gap-2.5 rounded-xl border border-line px-3.5 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={refetch}
                onChange={(event) => setRefetch(event.target.checked)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span>
                <span className="block text-xs font-medium text-fg">Refetch the page</span>
                <span className="block text-[11px] text-subtle">Downloads it again; only changed chunks are re-embedded.</span>
              </span>
            </label>
          ) : null}

          <ChunkingFields
            value={chunking}
            onChange={setChunking}
            options={options}
            textLength={(isNote ? content.trim() : detail?.content ?? '').length || item.char_count}
            defaultOpen
          />

          <p className="flex items-start gap-2 text-[11px] text-subtle">
            <Icon name="shield" size={13} className="mt-px" />
            Chunks are compared by SHA-256 hash: unchanged chunks keep their embeddings and only new or edited chunks are re-embedded.
          </p>

          {error ? (
            <div role="alert" className="rounded-xl bg-accent-soft px-3 py-2.5 text-xs text-accent-text">
              <p className="font-medium">{error.message}</p>
              {error.requestId ? <p className="font-mono text-[10px] opacity-80 break-all">ref {error.requestId}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 px-5 py-3 border-t border-line bg-surface">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving} disabled={!detail || Boolean(chunkingError(chunking, options))}>
            {saving ? 'Re-indexing…' : 'Save & re-index'}
          </Button>
        </div>
      </form>
    </div>
  );
}
