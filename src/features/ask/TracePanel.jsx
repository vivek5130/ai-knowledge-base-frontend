import { formatMs, formatScore } from '../../lib/format';

const SPAN_LABELS = {
  load_chunks: 'Load chunks',
  embed_query: 'Embed question',
  rank: 'Rank passages',
  generate: 'Generate answer',
  guardrail: 'Guardrail check',
  evaluate: 'Evaluate',
};

/** Waterfall of pipeline stages; the slowest stage is highlighted in crimson. */
export function TracePanel({ trace, evaluation, model }) {
  const total = Math.max(trace.total_ms, 1);
  const slowest = trace.spans.reduce((max, span) => (span.duration_ms > (max?.duration_ms ?? -1) ? span : max), null);
  // Spans run sequentially, so each starts where the previous ones ended.
  const offsets = trace.spans.map((_, i) => trace.spans.slice(0, i).reduce((sum, span) => sum + span.duration_ms, 0));

  return (
    <div className="border-t border-line px-5 py-4 bg-surface-2/40 rounded-b-2xl">
      <div className="space-y-2">
        {trace.spans.map((span, i) => {
          const left = (offsets[i] / total) * 100;
          const width = Math.max((span.duration_ms / total) * 100, 0.6);
          const isSlowest = span === slowest;
          return (
            <div key={span.name} className="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-3 text-xs">
              <span className={`truncate ${isSlowest ? 'text-fg font-medium' : 'text-muted'}`}>
                {SPAN_LABELS[span.name] ?? span.name}
              </span>
              <div className="relative h-2 rounded-full bg-surface-2" title={`${span.name}: ${formatMs(span.duration_ms)}`}>
                <div
                  className={`absolute top-0 h-2 rounded-full ${span.status === 'error' ? 'bg-accent' : isSlowest ? 'bg-accent' : 'bg-ink-bar'}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </div>
              <span className="text-right font-mono tabular-nums text-subtle">{formatMs(span.duration_ms)}</span>
            </div>
          );
        })}
      </div>

      <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <Stat label="Top score" value={formatScore(evaluation.top_score)} />
        <Stat label="Mean score" value={formatScore(evaluation.mean_score)} />
        <Stat label="Cited sources" value={`${evaluation.citations.length}`} />
        <Stat label="Embedding" value={(model.embedding ?? "").replace('models/', '')} />
      </dl>
      {trace.request_id ? (
        <p className="mt-3 font-mono text-[11px] text-subtle break-all">request_id {trace.request_id}</p>
      ) : null}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-subtle">{label}</dt>
      <dd className="font-mono text-fg truncate">{value}</dd>
    </div>
  );
}
