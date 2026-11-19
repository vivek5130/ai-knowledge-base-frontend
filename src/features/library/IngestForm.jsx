import { useRef, useState } from 'react';
import { Button, Icon, Segmented, inputClass } from '../../components/ui';
import { ChunkingFields } from './ChunkingFields';
import { fileExtension, formatBytes, chunkingError } from './sourceTypes';

const MODES = [
  { value: 'note', label: 'Note', icon: 'pencil' },
  { value: 'url', label: 'URL', icon: 'link' },
  { value: 'file', label: 'File', icon: 'upload' },
];
const MAX_NOTE = 20000;

/**
 * Note / URL / File (PDF, DOCX, TXT, MD) with per-item chunking settings.
 * `onSave(kind, payload)` returns an error (shown inline) or null on success.
 */
export function IngestForm({ onSave, options }) {
  const [mode, setMode] = useState('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [chunking, setChunking] = useState(options.defaults);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const ready = mode === 'note' ? content.trim() : mode === 'url' ? url.trim() : file;
  const invalidChunking = chunkingError(chunking, options);

  async function submit(event) {
    event.preventDefault();
    if (!ready || saving || invalidChunking) return;
    if (mode === 'url' && !/^https?:\/\//i.test(url.trim())) {
      setError({ message: 'URL must start with http:// or https://' });
      return;
    }
    setSaving(true);
    setError(null);
    const base = { title: title.trim() || undefined, chunking };
    const err =
      mode === 'file'
        ? await onSave('file', { ...base, file })
        : await onSave('json', {
            ...base,
            source_type: mode,
            ...(mode === 'note' ? { content: content.trim() } : { url: url.trim() }),
          });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setTitle('');
    setContent('');
    setUrl('');
    setFile(null);
  }

  const savingLabel = { note: 'Indexing…', url: 'Fetching & indexing…', file: 'Extracting & indexing…' }[mode];
  const saveLabel = { note: 'Save note', url: 'Save link', file: 'Upload file' }[mode];

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Segmented
        options={MODES}
        value={mode}
        onChange={(next) => {
          setMode(next);
          setError(null);
        }}
        label="Content type"
      />

      <div>
        <label htmlFor="ingest-title" className="block text-xs font-medium text-muted mb-1.5">
          Title <span className="text-subtle font-normal">(optional)</span>
        </label>
        <input
          id="ingest-title"
          type="text"
          value={title}
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={{ note: 'Defaults to the first line', url: 'Defaults to the page title', file: 'Defaults to the file name' }[mode]}
          className={inputClass}
        />
      </div>

      {mode === 'note' ? (
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label htmlFor="ingest-content" className="text-xs font-medium text-muted">Note</label>
            <span className={`text-[11px] tabular-nums ${content.length > MAX_NOTE * 0.9 ? 'text-accent-text' : 'text-subtle'}`}>
              {content.length.toLocaleString()} / {MAX_NOTE.toLocaleString()}
            </span>
          </div>
          <textarea
            id="ingest-content"
            rows={6}
            value={content}
            maxLength={MAX_NOTE}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Paste meeting notes, a snippet, an idea…"
            className={`${inputClass} resize-y min-h-28 leading-relaxed`}
          />
        </div>
      ) : null}

      {mode === 'url' ? (
        <div>
          <label htmlFor="ingest-url" className="block text-xs font-medium text-muted mb-1.5">Page URL</label>
          <input
            id="ingest-url"
            type="url"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/article"
            className={inputClass}
          />
          <p className="mt-1.5 text-[11px] text-subtle">The page is fetched on the server and its readable text is saved.</p>
        </div>
      ) : null}

      {mode === 'file' ? (
        <FileDrop
          file={file}
          options={options}
          onFile={(next, problem) => {
            setFile(next);
            setError(problem);
          }}
        />
      ) : null}

      <ChunkingFields
        value={chunking}
        onChange={setChunking}
        options={options}
        textLength={mode === 'note' ? content.trim().length : undefined}
      />

      {error ? (
        <div role="alert" className="flex items-start gap-2 rounded-xl bg-accent-soft px-3 py-2.5 text-xs text-accent-text">
          <Icon name="alert" size={14} className="mt-px" />
          <div className="min-w-0">
            <p className="font-medium">{error.message}</p>
            {error.requestId ? <p className="font-mono text-[10px] opacity-80 break-all">ref {error.requestId}</p> : null}
          </div>
        </div>
      ) : null}

      <Button type="submit" loading={saving} disabled={!ready || Boolean(invalidChunking)} className="w-full justify-center">
        {saving ? savingLabel : (
          <>
            <Icon name={mode === 'file' ? 'upload' : 'plus'} size={16} /> {saveLabel}
          </>
        )}
      </Button>
    </form>
  );
}

/** Drag-and-drop or click-to-browse file picker with client-side type/size checks. */
function FileDrop({ file, options, onFile }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const accept = options.file_types.join(',');

  function pick(candidate) {
    if (!candidate) return;
    const ext = fileExtension(candidate.name);
    if (ext === '.doc') return onFile(null, { message: 'Legacy .doc is not supported. Save it as .docx first.' });
    if (!options.file_types.includes(ext)) return onFile(null, { message: `Unsupported file type. Use ${options.file_types.join(', ')}` });
    if (candidate.size > options.max_upload_mb * 1024 * 1024) return onFile(null, { message: `File is larger than ${options.max_upload_mb} MB` });
    onFile(candidate, null);
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3">
        <span className="grid place-items-center w-9 h-9 rounded-lg bg-surface text-muted border border-line">
          <Icon name={fileExtension(file.name) === '.pdf' ? 'file' : 'note'} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg truncate">{file.name}</p>
          <p className="text-[11px] text-subtle">{formatBytes(file.size)}</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => onFile(null, null)} aria-label="Remove file">
          <Icon name="x" size={14} />
        </Button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        pick(event.dataTransfer.files?.[0]);
      }}
      className={`rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors ${
        dragging ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong'
      }`}
    >
      <Icon name="upload" size={22} className="mx-auto text-subtle" />
      <p className="mt-2 text-sm text-fg">
        Drop a file or{' '}
        <button type="button" onClick={() => inputRef.current?.click()} className="font-medium text-accent-text hover:underline cursor-pointer">
          browse
        </button>
      </p>
      <p className="mt-1 text-[11px] text-subtle">PDF, DOCX, TXT or MD · up to {options.max_upload_mb} MB</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        aria-label="Choose a file to upload"
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
