// Display metadata per source type, shared by the library and answer sources.

export const SOURCE_TYPES = {
  note: { label: 'Note', icon: 'pencil' },
  url: { label: 'Link', icon: 'link' },
  doc: { label: 'Doc', icon: 'note' },
  pdf: { label: 'PDF', icon: 'file' },
};

export const STRATEGY_LABELS = { sentence: 'Sentence', paragraph: 'Paragraph', fixed: 'Fixed' };

/** Used until GET /ingest/options answers (and if it fails). Mirrors the backend defaults. */
export const FALLBACK_OPTIONS = {
  strategies: {
    sentence: 'Packs whole sentences into each chunk. Best default for prose and notes.',
    paragraph: 'Keeps paragraphs together. Good for structured docs, lists and FAQs.',
    fixed: 'Fixed-size character windows. Predictable, ignores sentence boundaries.',
  },
  defaults: { strategy: 'sentence', size: 800, overlap: 100 },
  size_range: [200, 4000],
  overlap_max: 1000,
  file_types: ['.docx', '.markdown', '.md', '.pdf', '.txt'],
  max_upload_mb: 10,
};

export function fileExtension(name) {
  const match = /\.[^.]+$/.exec(name ?? '');
  return match ? match[0].toLowerCase() : '';
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Human summary of an IndexStats object from the API. */
export function describeIndex(index) {
  if (!index) return '';
  if (index.embedded === 0 && index.deleted === 0) return `no changes · ${index.reused} chunks reused`;
  const parts = [`${index.embedded} embedded`];
  if (index.reused) parts.push(`${index.reused} reused`);
  if (index.deleted) parts.push(`${index.deleted} removed`);
  return parts.join(' · ');
}

/** Validation shared by the ingest form and the edit dialog. Returns a message or null. */
export function chunkingError(value, options) {
  const [min, max] = options.size_range;
  if (!Number.isFinite(value.size) || value.size < min || value.size > max) return `Chunk size must be ${min}–${max}`;
  if (!Number.isFinite(value.overlap) || value.overlap < 0) return 'Overlap cannot be negative';
  if (value.overlap * 2 > value.size) return 'Overlap must be at most half the chunk size';
  return null;
}

/** Upload guardrail flags from the backend (guardrail_service.scan_content). */
export const FLAG_LABELS = {
  prompt_injection: {
    short: 'Instruction-like text',
    detail: 'Contains text that looks like instructions to the AI. It is treated as plain data, never followed.',
  },
  possible_secret: {
    short: 'Possible secret',
    detail: 'Looks like it contains a password or API key. Consider removing it.',
  },
};
