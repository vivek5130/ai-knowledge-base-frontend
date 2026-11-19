import { useEffect, useState } from 'react';
import { Badge, Button, ConfidenceBadge, Icon, Skeleton } from '../../components/ui';
import { formatMs } from '../../lib/format';
import { SourcesPanel } from './SourcesPanel';
import { TracePanel } from './TracePanel';

/** Visual treatment for each guardrail outcome (see backend query_service). */
const STATUS = {
  insufficient: { icon: 'info', title: 'Outside the knowledge base', tone: 'neutral' },
  clarify: { icon: 'help', title: 'Could you clarify?', tone: 'neutral' },
  escalate: { icon: 'flag', title: 'Needs a person', tone: 'accent' },
};

/** One question + its answer (or loading / error state). */
export function AnswerTurn({ turn, onRetry, onFeedback, onEscalate, onReply, onGoLibrary }) {
  return (
    <article className="flex flex-col gap-3" aria-busy={turn.status === 'loading'}>
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-surface-2 px-4 py-2.5 text-[15px] text-fg leading-relaxed whitespace-pre-wrap">
          {turn.question}
        </p>
      </div>

      {turn.status === 'loading' ? <LoadingAnswer startedAt={turn.startedAt} /> : null}
      {turn.status === 'error' ? <ErrorAnswer error={turn.error} onRetry={() => onRetry(turn)} /> : null}
      {turn.status === 'done' ? (
        <Answer turn={turn} onFeedback={onFeedback} onEscalate={onEscalate} onReply={onReply} onGoLibrary={onGoLibrary} />
      ) : null}
    </article>
  );
}

function AssistantMark() {
  return (
    <span className="grid place-items-center w-7 h-7 rounded-full bg-fg text-bg shrink-0" aria-hidden="true">
      <Icon name="inbox" size={14} strokeWidth={2} />
    </span>
  );
}

function LoadingAnswer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  return (
    <div className="flex gap-3">
      <AssistantMark />
      <div className="flex-1 pt-1">
        <div className="flex items-center gap-2 text-xs text-muted mb-3">
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-accent opacity-60 animate-ping-slow" />
            <span className="relative w-2 h-2 rounded-full bg-accent" />
          </span>
          Searching your sources and writing an answer
          <span className="ml-auto font-mono tabular-nums text-subtle">{Math.floor(elapsed / 1000)}s</span>
        </div>
        <div className="space-y-2.5">
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      </div>
    </div>
  );
}

function ErrorAnswer({ error, onRetry }) {
  return (
    <div className="flex gap-3">
      <AssistantMark />
      <div role="alert" className="flex-1 rounded-2xl border border-accent/30 bg-accent-soft p-4">
        <div className="flex items-start gap-3">
          <Icon name="alert" size={18} className="text-accent-text mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-fg">{error.message}</p>
            <p className="mt-1 font-mono text-[11px] text-muted break-all">
              {error.code}
              {error.requestId ? ` · ref ${error.requestId}` : ''}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <Icon name="refresh" size={13} /> Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

function Answer({ turn, onFeedback, onEscalate, onReply, onGoLibrary }) {
  const { result } = turn;
  const { evaluation, model, trace } = result;
  const status = result.status ?? 'answered';
  const special = STATUS[status];
  const [focus, setFocus] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [escalating, setEscalating] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  async function escalate() {
    setEscalating(true);
    await onEscalate(turn);
    setEscalating(false);
  }

  const gated = result.guardrail?.stage === 'retrieval_gate';

  return (
    <div className="flex gap-3">
      <AssistantMark />
      <div className="flex-1 min-w-0 flex flex-col gap-3 pt-0.5">
        {special ? (
          <div className={`rounded-2xl border p-4 ${special.tone === 'accent' ? 'border-accent/30 bg-accent-soft' : 'border-line bg-surface'}`}>
            <p className={`flex items-center gap-2 text-sm font-semibold ${special.tone === 'accent' ? 'text-accent-text' : 'text-fg'}`}>
              <Icon name={special.icon} size={16} /> {special.title}
            </p>
            <p className="mt-1.5 text-[15px] leading-7 text-fg">{result.answer}</p>
            {status === 'clarify' && result.clarifying_question ? (
              <p className="mt-3 rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm text-fg">
                <span className="text-subtle">Question: </span>
                {result.clarifying_question}
              </p>
            ) : null}
            {result.guardrail?.reason && status !== 'clarify' ? (
              <p className="mt-2 text-xs text-subtle">{result.guardrail.reason}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {status === 'clarify' ? (
                <Button size="sm" onClick={() => onReply(result.clarifying_question)}>
                  <Icon name="ask" size={13} /> Reply
                </Button>
              ) : null}
              {status === 'insufficient' ? (
                <Button size="sm" variant="secondary" onClick={onGoLibrary}>
                  <Icon name="plus" size={13} /> Add a source
                </Button>
              ) : null}
              {status !== 'escalate' && !result.escalated ? (
                <Button size="sm" variant="ghost" loading={escalating} onClick={escalate}>
                  <Icon name="flag" size={13} /> Escalate to a person
                </Button>
              ) : null}
              {result.escalated ? <Badge tone="accent" icon="flag">In review queue</Badge> : null}
            </div>
          </div>
        ) : (
          <div className="text-[15px] leading-7 text-fg">
            <AnswerText
              text={result.answer}
              sourceCount={result.sources.length}
              onCite={(n) => setFocus({ n, nonce: Date.now() })}
            />
          </div>
        )}

        {status === 'answered' && evaluation.warnings.length > 0 ? (
          <ul className="rounded-xl border border-accent/20 bg-accent-soft px-3.5 py-2.5 space-y-1">
            {evaluation.warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2 text-xs text-accent-text">
                <Icon name="alert" size={13} className="mt-0.5" />
                {warning}
              </li>
            ))}
          </ul>
        ) : null}

        <SourcesPanel
          sources={result.sources}
          citations={evaluation.citations}
          focus={focus}
          label={gated ? 'Closest passages' : 'Sources'}
          muted={gated}
        />

        <div className="flex flex-wrap items-center gap-1 -ml-2">
          {status === 'answered' ? <FeedbackButtons value={result.feedback} onChange={(rating) => onFeedback(turn, rating)} /> : null}
          <IconAction icon={copied ? 'check' : 'copy'} label={copied ? 'Copied' : 'Copy'} onClick={copy} />
          {status === 'answered' ? (
            result.escalated ? (
              <Badge tone="accent" icon="flag" className="ml-1">In review queue</Badge>
            ) : (
              <IconAction icon="flag" label="Escalate to a person" onClick={escalate} disabled={escalating} />
            )
          ) : null}
          <IconAction icon="activity" label="Show trace" onClick={() => setShowTrace((open) => !open)} pressed={showTrace} />
          <span className="ml-auto flex items-center gap-1.5">
            {status === 'answered' ? <ConfidenceBadge confidence={evaluation.confidence} /> : null}
            {status === 'answered' && !evaluation.grounded ? <Badge tone="accent" icon="alert">Not grounded</Badge> : null}
            <span className="hidden sm:inline text-[11px] text-subtle font-mono">
              {model.fallback ? 'no LLM call' : model.llm} · {formatMs(trace.total_ms)}
            </span>
          </span>
        </div>

        {showTrace ? (
          <div className="rounded-2xl border border-line overflow-hidden">
            <TracePanel trace={trace} evaluation={evaluation} model={model} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function IconAction({ icon, label, onClick, pressed, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={`grid place-items-center h-8 w-8 rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${
        pressed ? 'bg-surface-2 text-fg' : 'text-subtle hover:text-fg hover:bg-surface-2'
      }`}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

/** Renders the answer, turning [1] / [1, 2] into clickable citation chips and **bold** into <strong>. */
function AnswerText({ text, sourceCount, onCite }) {
  const parts = text.split(/(\[\d+(?:\s*,\s*\d+)*\])/g);
  return (
    <p className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+(?:\s*,\s*\d+)*)\]$/);
        if (!match) return <Bold key={i} text={part} />;
        return match[1].split(',').map((raw) => {
          const n = Number(raw.trim());
          const valid = n >= 1 && n <= sourceCount;
          return (
            <button
              key={`${i}-${n}`}
              type="button"
              disabled={!valid}
              onClick={() => onCite(n)}
              title={valid ? `Show source ${n}` : 'Citation does not match a retrieved source'}
              className={`inline-grid place-items-center min-w-5 h-5 mx-0.5 px-1 -translate-y-px rounded-full text-[11px] font-semibold align-middle transition-colors ${
                valid
                  ? 'bg-surface-2 text-muted hover:bg-accent hover:text-white cursor-pointer'
                  : 'bg-surface-2 text-subtle line-through'
              }`}
            >
              {n}
            </button>
          );
        });
      })}
    </p>
  );
}

function Bold({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
    chunk.startsWith('**') && chunk.endsWith('**') ? (
      <strong key={i} className="font-semibold">{chunk.slice(2, -2)}</strong>
    ) : (
      chunk
    ),
  );
}

function FeedbackButtons({ value, onChange }) {
  const base = 'grid place-items-center h-8 w-8 rounded-lg transition-colors cursor-pointer';
  return (
    <div className="flex items-center" role="group" aria-label="Was this answer helpful?">
      <button
        type="button"
        aria-pressed={value === 1}
        aria-label="Helpful"
        title="Helpful"
        onClick={() => onChange(value === 1 ? null : 1)}
        className={`${base} ${value === 1 ? 'bg-good-soft text-good-text' : 'text-subtle hover:text-fg hover:bg-surface-2'}`}
      >
        <Icon name="up" size={15} />
      </button>
      <button
        type="button"
        aria-pressed={value === -1}
        aria-label="Not helpful"
        title="Not helpful"
        onClick={() => onChange(value === -1 ? null : -1)}
        className={`${base} ${value === -1 ? 'bg-accent-soft text-accent-text' : 'text-subtle hover:text-fg hover:bg-surface-2'}`}
      >
        <Icon name="down" size={15} />
      </button>
    </div>
  );
}
