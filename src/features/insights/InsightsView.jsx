import { useCallback } from 'react';
import { api } from '../../api/client';
import { Badge, Button, Card, EmptyState, Icon, Skeleton } from '../../components/ui';
import { usePolling } from '../../hooks/usePolling';
import { formatMs, formatPct, formatScore, timeAgo } from '../../lib/format';

const REFRESH_MS = 10000;
const STAGES = [
  ['load_chunks', 'Load chunks'],
  ['embed_query', 'Embed question'],
  ['rank', 'Rank passages'],
  ['guardrail', 'Guardrail check'],
  ['generate', 'Generate answer'],
  ['evaluate', 'Evaluate'],
];
const STATUS_META = {
  answered: { label: 'Answered', color: 'bg-good', help: 'Grounded answer with citations' },
  smalltalk: { label: 'Small talk', color: 'bg-line-strong', help: 'Greetings and thanks' },
  insufficient: { label: 'Declined', color: 'bg-subtle', help: 'Out of scope or not allowed' },
  clarify: { label: 'Asked to clarify', color: 'bg-ink-bar', help: 'Question was vague or ambiguous' },
  escalate: { label: 'Escalated', color: 'bg-accent', help: 'Needs a person' },
};

/** Observability + guardrails + evaluation dashboard, grouped into readable sections. */
export function InsightsView({ onOpenQuery }) {
  const load = useCallback(async () => {
    const [metrics, ready, queries, review, evalReport] = await Promise.all([
      api.metrics(),
      api.ready().catch((err) => ({ status: 'error', error: err })),
      api.listQueries(10),
      api.listQueries(10, true),
      api.latestEval().catch((err) => (err.status === 404 ? null : Promise.reject(err))),
    ]);
    return { metrics, ready, queries: queries.queries, review: review.queries, evalReport };
  }, []);

  const { data, error, loading, refresh, updatedAt } = usePolling(load, REFRESH_MS);

  if (loading && !data) return <InsightsSkeleton />;
  if (error && !data) {
    return (
      <Page>
        <Card>
          <EmptyState icon="alert" title="Couldn't load metrics" action={<Button variant="secondary" onClick={refresh}>Try again</Button>}>
            {error.message}
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const { metrics, ready, queries, review, evalReport } = data;
  const runtime = parseRuntime(metrics.runtime);
  const quality = metrics.quality;
  const statusCounts = quality.status ?? { answered: quality.total_queries, smalltalk: 0, insufficient: 0, clarify: 0, escalate: 0 };

  return (
    <Page>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-xs text-muted">
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-good opacity-60 animate-ping-slow" />
            <span className="relative w-2 h-2 rounded-full bg-good" />
          </span>
          Live · updates every {REFRESH_MS / 1000}s{updatedAt ? ` · last ${updatedAt.toLocaleTimeString()}` : ''}
        </span>
        {error ? <span className="text-xs text-accent-text">Last refresh failed</span> : null}
        <Button variant="secondary" size="sm" className="ml-auto" onClick={refresh}>
          <Icon name="refresh" size={13} /> Refresh
        </Button>
      </div>

      <ProviderStrip ready={ready} uptime={metrics.runtime.uptime_s} />

      <Section title="Overview" description="The headline numbers for answer quality and reliability.">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Questions" value={quality.total_queries.toLocaleString()} hint="All time" />
          <Kpi
            label="Grounded"
            value={formatPct(quality.grounded_rate)}
            hint="Cited sources, or declined honestly"
            tone={rateTone(quality.grounded_rate)}
          />
          <Kpi
            label="Helpful"
            value={formatPct(quality.feedback.satisfaction)}
            hint={`${quality.feedback.up} 👍 · ${quality.feedback.down} 👎`}
            tone={rateTone(quality.feedback.satisfaction)}
          />
          <Kpi
            label="Server errors"
            value={formatPct(runtime.errorRate, 1)}
            hint={`${runtime.errors5xx} of ${runtime.totalRequests} requests`}
            tone={runtime.errors5xx > 0 ? 'bad' : 'good'}
          />
        </div>
      </Section>

      <Section
        title="How questions were handled"
        description="Guardrails decide whether to answer, decline, ask for clarification or hand off to a person."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <StatusCard counts={statusCounts} total={quality.total_queries} />
          <ConfidenceCard confidence={quality.confidence} total={quality.total_queries} />
        </div>
      </Section>

      <Section
        title="Needs review"
        description="Answers escalated by the model or flagged by a user. Open one to see the full answer and sources."
        badge={quality.escalated_open ? <Badge tone="accent" icon="flag">{quality.escalated_open} open</Badge> : null}
      >
        <ReviewQueue items={review} onOpenQuery={onOpenQuery} />
      </Section>

      <Section title="Performance" description="Where time goes inside one question, and how each endpoint behaves.">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <StageLatencyCard stages={runtime.stages} queryP95={runtime.queryP95} avg={quality.avg_latency_ms} />
          <EndpointsCard endpoints={runtime.endpoints} />
        </div>
      </Section>

      <Section
        title="Offline evaluation"
        description="Scores retrieval and answers against a fixed golden dataset (python -m eval.run_eval)."
      >
        <EvalCard report={evalReport} />
      </Section>

      <Section title="Recent questions" description="Click a question to reopen its answer, sources and trace.">
        <RecentQueries queries={queries} onOpenQuery={onOpenQuery} />
      </Section>
    </Page>
  );
}

/* ---------- layout ---------- */

function Page({ children }) {
  return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8">{children}</div>;
}

function Section({ title, description, badge, children }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-fg tracking-tight">{title}</h2>
          <p className="text-[13px] text-muted">{description}</p>
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

/* ---------- data shaping ---------- */

/** Metric keys look like "http.latency|method=GET,route=/items". */
function parseKey(key) {
  const [name, labelPart] = key.split('|');
  const labels = Object.fromEntries((labelPart ? labelPart.split(',') : []).map((pair) => pair.split('=')));
  return { name, labels };
}

function parseRuntime(runtime) {
  const endpoints = {};
  let totalRequests = 0;
  let errors5xx = 0;
  const ensure = (labels) => {
    const id = `${labels.method} ${labels.route}`;
    endpoints[id] ??= { method: labels.method, route: labels.route, count: 0, e4: 0, e5: 0 };
    return endpoints[id];
  };

  for (const [key, value] of Object.entries(runtime.counters)) {
    const { name, labels } = parseKey(key);
    if (name !== 'http.requests') continue;
    const endpoint = ensure(labels);
    endpoint.count += value;
    if (labels.status_class === '4xx') endpoint.e4 += value;
    if (labels.status_class === '5xx') {
      endpoint.e5 += value;
      errors5xx += value;
    }
    totalRequests += value;
  }

  const stages = {};
  let queryP95 = null;
  for (const [key, summary] of Object.entries(runtime.timers)) {
    const { name, labels } = parseKey(key);
    if (name === 'http.latency') {
      Object.assign(ensure(labels), { p50: summary.p50_ms, p95: summary.p95_ms });
      if (labels.route === '/query' && labels.method === 'POST') queryP95 = summary.p95_ms;
    }
    if (name === 'rag.stage') stages[labels.stage] = summary;
  }

  return {
    endpoints: Object.values(endpoints)
      .filter((endpoint) => endpoint.route !== 'unmatched')
      .sort((a, b) => b.count - a.count),
    stages,
    totalRequests,
    errors5xx,
    errorRate: totalRequests ? errors5xx / totalRequests : null,
    queryP95,
  };
}

function rateTone(rate) {
  if (rate == null) return 'neutral';
  if (rate >= 0.8) return 'good';
  if (rate < 0.5) return 'bad';
  return 'neutral';
}

function formatUptime(seconds) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} h`;
}

/* ---------- pieces ---------- */

function ProviderStrip({ ready, uptime }) {
  const providers = ready.providers ?? {};
  const ok = ready.status === 'ok';
  const items = [
    { label: 'API', value: ok ? 'Healthy' : ready.status === 'error' ? 'Unreachable' : 'Degraded', tone: ok ? 'good' : 'bad' },
    { label: 'Database', value: ready.checks?.database === 'ok' ? 'SQLite OK' : 'Error', tone: ready.checks?.database === 'ok' ? 'good' : 'bad' },
    { label: 'Embeddings', value: (providers.embedding_model ?? '—').replace('models/', ''), tone: providers.gemini_enabled ? 'good' : 'neutral' },
    { label: 'LLM', value: providers.llm_model ?? '—', tone: providers.gemini_enabled ? 'good' : 'neutral' },
    { label: 'Uptime', value: formatUptime(uptime), tone: 'neutral' },
  ];
  const dot = { good: 'bg-good', bad: 'bg-accent', neutral: 'bg-subtle' };
  return (
    <Card className="flex flex-wrap divide-x divide-line overflow-hidden">
      {items.map((item) => (
        <div key={item.label} className="flex-1 min-w-36 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-subtle">{item.label}</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-medium text-fg min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dot[item.tone]}`} />
            <span className="truncate" title={item.value}>{item.value}</span>
          </p>
        </div>
      ))}
    </Card>
  );
}

function Kpi({ label, value, hint, tone = 'neutral' }) {
  const valueColor = { good: 'text-good-text', bad: 'text-accent-text', neutral: 'text-fg' }[tone];
  return (
    <Card className="p-4">
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${valueColor}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-subtle">{hint}</p> : null}
    </Card>
  );
}

/** Labelled horizontal bars (one per category) — easier to read than a stacked bar. */
function BarList({ rows, total }) {
  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const share = total ? row.value / total : 0;
        return (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-fg">
                <span className={`w-2.5 h-2.5 rounded-sm ${row.color}`} />
                {row.label}
                {row.help ? <span className="hidden sm:inline text-xs text-subtle">· {row.help}</span> : null}
              </span>
              <span className="tabular-nums text-fg font-medium">
                {row.value}
                <span className="ml-1.5 text-xs font-normal text-subtle">{formatPct(share)}</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-surface-2 overflow-hidden" title={`${row.label}: ${row.value}`}>
              <div className={`h-full rounded-full ${row.color}`} style={{ width: `${share * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function StatusCard({ counts, total }) {
  const rows = Object.entries(STATUS_META).map(([key, meta]) => ({ key, ...meta, value: counts[key] ?? 0 }));
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-fg">Outcome</h3>
      <p className="text-xs text-subtle mb-4">What the assistant did with each question</p>
      {total ? <BarList rows={rows} total={total} /> : <p className="py-6 text-center text-sm text-subtle">No questions yet.</p>}
    </Card>
  );
}

function ConfidenceCard({ confidence, total }) {
  const rows = [
    { key: 'high', label: 'High', color: 'bg-good', help: 'top score ≥ 0.70', value: confidence.high },
    { key: 'medium', label: 'Medium', color: 'bg-subtle', help: '0.60 – 0.70', value: confidence.medium },
    { key: 'low', label: 'Low', color: 'bg-accent', help: 'below 0.60', value: confidence.low },
  ];
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-fg">Retrieval confidence</h3>
      <p className="text-xs text-subtle mb-4">How closely the best passage matched the question</p>
      {total ? <BarList rows={rows} total={total} /> : <p className="py-6 text-center text-sm text-subtle">No questions yet.</p>}
    </Card>
  );
}

function ReviewQueue({ items, onOpenQuery }) {
  if (!items.length) {
    return (
      <Card className="flex items-center gap-3 px-5 py-4">
        <span className="grid place-items-center w-8 h-8 rounded-full bg-good-soft text-good-text">
          <Icon name="check" size={15} strokeWidth={2.2} />
        </span>
        <p className="text-sm text-muted">Nothing waiting for review.</p>
      </Card>
    );
  }
  return (
    <Card className="divide-y divide-line overflow-hidden">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onOpenQuery(item.id)}
          className="w-full flex items-start gap-3 px-5 py-3.5 text-left hover:bg-surface-2 cursor-pointer"
        >
          <Icon name="flag" size={15} className="mt-0.5 text-accent-text" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-fg truncate">{item.question}</span>
            <span className="block text-xs text-muted truncate">{item.escalation_reason || 'No reason given'}</span>
          </span>
          <span className="text-xs text-subtle whitespace-nowrap">{timeAgo(item.created_at)}</span>
          <Icon name="right" size={14} className="mt-0.5 text-subtle" />
        </button>
      ))}
    </Card>
  );
}

function StageLatencyCard({ stages, queryP95, avg }) {
  const rows = STAGES.filter(([key]) => stages[key]);
  const max = Math.max(...rows.map(([key]) => stages[key].avg_ms), 1);
  const slowest = rows.reduce((best, [key]) => (!best || stages[key].avg_ms > stages[best].avg_ms ? key : best), null);
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-fg">Time per question</h3>
          <p className="text-xs text-subtle">Average per pipeline stage since server start</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold tabular-nums text-fg">{formatMs(queryP95)}</p>
          <p className="text-[11px] text-subtle">p95 end to end · avg {formatMs(avg)}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-subtle">Ask a question to collect timings.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(([key, label]) => {
            const stage = stages[key];
            const isSlowest = key === slowest;
            return (
              <li key={key}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className={isSlowest ? 'text-fg font-medium' : 'text-muted'}>
                    {label}
                    {isSlowest ? <span className="ml-2 text-[11px] font-normal text-accent-text">slowest</span> : null}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-muted">
                    {formatMs(stage.avg_ms)} <span className="text-subtle">· p95 {formatMs(stage.p95_ms)}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isSlowest ? 'bg-accent' : 'bg-ink-bar'}`}
                    style={{ width: `${Math.max((stage.avg_ms / max) * 100, 1)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function EndpointsCard({ endpoints }) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-fg">Endpoints</h3>
        <p className="text-xs text-subtle">Calls, latency and errors since server start</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-xs text-subtle border-y border-line bg-surface-2/50">
              <th className="font-medium px-5 py-2">Route</th>
              <th className="font-medium px-2 py-2 text-right">Calls</th>
              <th className="font-medium px-2 py-2 text-right">p95</th>
              <th className="font-medium px-5 py-2 text-right">Errors</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((endpoint) => (
              <tr key={`${endpoint.method} ${endpoint.route}`} className="border-b border-line last:border-0">
                <td className="px-5 py-2.5 whitespace-nowrap">
                  <span className="inline-block w-12 font-mono text-[11px] text-subtle">{endpoint.method}</span>
                  <span className="font-mono text-xs text-fg">{endpoint.route}</span>
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums text-fg">{endpoint.count}</td>
                <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-muted">{formatMs(endpoint.p95)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums whitespace-nowrap text-xs">
                  {endpoint.e5 ? <span className="text-accent-text font-medium">{endpoint.e5} server</span> : null}
                  {endpoint.e5 && endpoint.e4 ? ' · ' : null}
                  {endpoint.e4 ? <span className="text-muted">{endpoint.e4} client</span> : null}
                  {!endpoint.e4 && !endpoint.e5 ? <span className="text-subtle">—</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function EvalCard({ report }) {
  if (!report) {
    return (
      <Card>
        <EmptyState icon="flask" title="No evaluation run yet">
          Run <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface-2 text-fg">python -m eval.run_eval</code> in{' '}
          <code className="font-mono text-xs">backend/</code> to score retrieval against the golden dataset.
        </EmptyState>
      </Card>
    );
  }
  const { summary } = report;
  const metrics = [
    { label: `Found in top ${report.top_k}`, sub: `hit@${report.top_k}`, value: formatPct(summary.hit_at_k), tone: rateTone(summary.hit_at_k) },
    { label: 'Ranked first', sub: 'hit@1', value: formatPct(summary.hit_at_1), tone: rateTone(summary.hit_at_1) },
    { label: 'Ranking quality', sub: 'MRR', value: summary.mrr.toFixed(2), tone: rateTone(summary.mrr) },
    { label: 'Expected facts in answer', sub: 'keyword recall', value: formatPct(summary.keyword_recall), tone: rateTone(summary.keyword_recall) },
  ];
  if (summary.guardrail_accuracy != null) {
    metrics.push({
      label: 'Off-topic declined',
      sub: 'guardrail accuracy',
      value: formatPct(summary.guardrail_accuracy),
      tone: rateTone(summary.guardrail_accuracy),
    });
  }
  const valueColor = { good: 'text-good-text', bad: 'text-accent-text', neutral: 'text-fg' };
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-5 pt-4 text-xs text-subtle">
        <span>{report.dataset}</span>·<span>{summary.questions} questions</span>·
        <span>{report.embedding_model.replace('models/', '')}</span>·<span>ran {timeAgo(report.ran_at)}</span>
        <span className="ml-auto">
          {summary.errors ? <Badge tone="accent" icon="alert">{summary.errors} errors</Badge> : <Badge tone="good" icon="check">No errors</Badge>}
        </span>
      </div>
      <div className="px-5 pt-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl bg-surface-2 px-4 py-3">
            <p className="text-xs text-muted">{metric.label}</p>
            <p className={`mt-0.5 text-2xl font-semibold tabular-nums ${valueColor[metric.tone]}`}>{metric.value}</p>
            <p className="text-[11px] font-mono text-subtle">{metric.sub}</p>
          </div>
        ))}
      </div>
      <details className="group mt-4 border-t border-line">
        <summary className="flex items-center gap-2 px-5 py-3 text-sm text-muted hover:text-fg cursor-pointer list-none">
          <Icon name="chevron" size={14} className="transition-transform group-open:rotate-180" />
          Per-question results
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-xs text-subtle border-y border-line bg-surface-2/50">
                <th className="font-medium px-5 py-2">Question</th>
                <th className="font-medium px-3 py-2 text-right">Rank</th>
                <th className="font-medium px-3 py-2 text-right">Facts found</th>
                <th className="font-medium px-5 py-2 text-right">Top score</th>
              </tr>
            </thead>
            <tbody>
              {report.cases.map((row) => (
                <tr key={row.question} className="border-b border-line last:border-0">
                  <td className="px-5 py-2.5 text-fg max-w-[26rem] truncate" title={row.question}>{row.question}</td>
                  <td className="px-3 py-2.5 text-right">
                    {row.rank === 1 ? (
                      <span className="text-good-text font-medium">1st</span>
                    ) : row.rank ? (
                      <span className="text-fg">{row.rank}</span>
                    ) : (
                      <span className="text-accent-text font-medium">missed</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums" title={row.missing_keywords?.length ? `Missing: ${row.missing_keywords.join(', ')}` : 'All found'}>
                    {formatPct(row.keyword_recall)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-xs tabular-nums text-muted">{formatScore(row.top_score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}

function RecentQueries({ queries, onOpenQuery }) {
  if (!queries.length) return <Card className="px-5 py-4 text-sm text-subtle">No questions yet.</Card>;
  return (
    <Card className="divide-y divide-line overflow-hidden">
      {queries.map((query) => {
        const meta = STATUS_META[query.status] ?? STATUS_META.answered;
        return (
          <button
            key={query.id}
            type="button"
            onClick={() => onOpenQuery(query.id)}
            className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-surface-2 cursor-pointer"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${meta.color}`} title={meta.label} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-fg truncate">{query.question}</span>
              <span className="block text-xs text-subtle">
                {meta.label} · {timeAgo(query.created_at)} · {formatMs(query.latency_ms)}
              </span>
            </span>
            {query.escalated ? <Icon name="flag" size={14} className="text-accent-text" /> : null}
            {query.feedback === 1 ? <Icon name="up" size={14} className="text-good-text" /> : null}
            {query.feedback === -1 ? <Icon name="down" size={14} className="text-accent-text" /> : null}
            <Icon name="right" size={14} className="text-subtle" />
          </button>
        );
      })}
    </Card>
  );
}

function InsightsSkeleton() {
  return (
    <Page>
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
      </div>
    </Page>
  );
}
