import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Badge, Button, Card, EmptyState, Icon, Skeleton, inputClass } from '../../components/ui';
import { timeAgo } from '../../lib/format';

const EDITABLE = ['assistant_name', 'tone', 'system_prompt', 'top_k', 'min_relevance', 'allow_clarify', 'allow_escalate'];
// One-click additions appended to the prompt's end.
const PROMPT_SNIPPETS = [
  'Answer in bullet points.',
  'Always mention dates and numbers exactly as written in the sources.',
  'Reply in the same language as the question.',
  'Keep answers under 80 words.',
];
const TONE_LABELS = { neutral: 'Neutral', friendly: 'Friendly', formal: 'Formal', concise: 'Concise' };
const MAX_PROMPT = 8000;

const pick = (settings) => Object.fromEntries(EDITABLE.map((key) => [key, settings[key]]));

/**
 * Agent configuration: everything that shapes answers, stored on the server and applied
 * to the next question. The full system prompt is editable; only the JSON output format is fixed.
 */
export function AgentView({ onSaved, onError }) {
  const [server, setServer] = useState(null); // last saved settings + metadata
  const [draft, setDraft] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .getAgentSettings()
      .then((data) => {
        if (!active) return;
        setServer(data);
        setDraft(pick(data));
      })
      .catch((err) => active && setLoadError(err));
    return () => {
      active = false;
    };
  }, []);

  if (loadError) {
    return (
      <Page>
        <Card>
          <EmptyState icon="alert" title="Couldn't load agent settings">{loadError.message}</EmptyState>
        </Card>
      </Page>
    );
  }
  if (!draft) {
    return (
      <Page>
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
      </Page>
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(pick(server));
  const isDefault = JSON.stringify(draft) === JSON.stringify(pick(server.defaults));
  const invalid = !draft.assistant_name.trim()
    ? 'Give the assistant a name'
    : draft.system_prompt.trim().length < 20
      ? 'The system prompt is too short'
      : null;
  const set = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  async function save() {
    if (invalid) return;
    setSaving(true);
    try {
      const data = await api.updateAgentSettings({ ...draft, assistant_name: draft.assistant_name.trim() });
      setServer(data);
      setDraft(pick(data));
      onSaved('Agent settings saved — they apply to your next question');
    } catch (err) {
      onError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
        <Icon name="shield" size={13} />
        <span>
          {server.updated_at ? `Last saved ${timeAgo(server.updated_at)}` : 'Using default settings'} · applies to every new question
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          disabled={isDefault}
          onClick={() => setDraft(pick(server.defaults))}
          title="Load default values (still needs Save)"
        >
          <Icon name="refresh" size={13} /> Reset to defaults
        </Button>
      </div>

      <Section icon="ask" title="Identity & tone" description="How the assistant introduces itself and sounds.">
        <label className="block">
          <span className="block text-xs font-medium text-muted mb-1.5">Assistant name</span>
          <input
            value={draft.assistant_name}
            maxLength={60}
            onChange={(event) => set({ assistant_name: event.target.value })}
            className={`${inputClass} max-w-sm`}
          />
        </label>
        <div className="mt-4">
          <p className="text-xs font-medium text-muted mb-2">Tone</p>
          <div role="radiogroup" aria-label="Tone" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {Object.entries(server.tones).map(([key, description]) => {
              const active = draft.tone === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set({ tone: key })}
                  className={`text-left rounded-xl border px-3.5 py-3 transition-colors cursor-pointer ${
                    active ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong'
                  }`}
                >
                  <span className="flex items-center justify-between text-sm font-medium text-fg">
                    {TONE_LABELS[key] ?? key}
                    {active ? <Icon name="check" size={14} className="text-accent-text" /> : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      <PromptSection
        value={draft.system_prompt}
        defaultValue={server.defaults.system_prompt}
        placeholders={server.placeholders}
        contract={server.output_contract}
        onChange={(system_prompt) => set({ system_prompt })}
      />

      <Section icon="search" title="Retrieval" description="How many passages are used, and how relevant they must be.">
        <div className="grid gap-6 lg:grid-cols-2">
          <SliderField
            label="Passages per answer"
            help="More passages give more context but slower, noisier answers."
            value={draft.top_k}
            min={1}
            max={20}
            step={1}
            format={(v) => `${v}`}
            onChange={(top_k) => set({ top_k })}
          />
          <div>
            <SliderField
              label="Relevance threshold"
              help="If the best passage scores below this, the model gets no sources and can only greet, decline or ask to clarify."
              value={draft.min_relevance}
              min={0.3}
              max={0.9}
              step={0.01}
              format={(v) => v.toFixed(2)}
              onChange={(min_relevance) => set({ min_relevance })}
            />
            <ThresholdScale value={draft.min_relevance} model={server.embedding_model} />
          </div>
        </div>
      </Section>

      <Section icon="help" title="Behaviour" description="What the assistant may do when it can't simply answer.">
        <div className="grid gap-2">
          <Toggle
            checked={draft.allow_clarify}
            onChange={(allow_clarify) => set({ allow_clarify })}
            title="Ask clarifying questions"
            description="For vague questions like “tell me more about it”, ask which topic is meant instead of guessing."
          />
          <Toggle
            checked={draft.allow_escalate}
            onChange={(allow_escalate) => set({ allow_escalate })}
            title="Escalate to a person"
            description="Hand off complaints, requests for a human, and legal / medical / financial decisions to the review queue."
          />
        </div>
        <p className="mt-2 text-[11px] text-subtle">When a behaviour is off, the model declines those questions in its own words instead.</p>
      </Section>

      {dirty ? (
        <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lg shadow-black/10">
          <span className="w-2 h-2 rounded-full bg-accent" aria-hidden="true" />
          <span className="text-sm text-fg">{invalid ?? 'You have unsaved changes'}</span>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDraft(pick(server))} disabled={saving}>Discard</Button>
            <Button size="sm" loading={saving} disabled={Boolean(invalid)} onClick={save}>Save changes</Button>
          </div>
        </div>
      ) : null}
    </Page>
  );
}

function Page({ children }) {
  return <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">{children}</div>;
}

function Section({ icon, title, description, badge, children }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3 mb-4">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-surface-2 text-muted shrink-0">
          <Icon name={icon} size={15} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          <p className="text-[13px] text-muted">{description}</p>
        </div>
        {badge}
      </div>
      {children}
    </Card>
  );
}

function SliderField({ label, help, value, min, max, step, format, onChange }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-fg">{label}</span>
        <span className="font-mono text-lg font-semibold tabular-nums text-fg">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-[var(--accent)] cursor-pointer"
      />
      <div className="flex justify-between text-[10px] font-mono text-subtle">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
      <p className="mt-1.5 text-xs text-subtle">{help}</p>
    </div>
  );
}

/** Shows the threshold against the score bands measured for the Gemini embedding model. */
function ThresholdScale({ value, model }) {
  const min = 0.3;
  const max = 0.9;
  const pos = (v) => `${((v - min) / (max - min)) * 100}%`;
  const isGemini = model.includes('gemini');
  return (
    <div className="mt-3 rounded-xl bg-surface-2 px-3.5 py-3">
      <div className="relative h-2 rounded-full bg-surface">
        {isGemini ? (
          <>
            <div className="absolute top-0 h-2 rounded-full bg-subtle/60" style={{ left: pos(0.5), width: `calc(${pos(0.6)} - ${pos(0.5)})` }} title="Typical off-topic questions" />
            <div className="absolute top-0 h-2 rounded-full bg-good" style={{ left: pos(0.72), width: `calc(${pos(0.85)} - ${pos(0.72)})` }} title="Typical on-topic questions" />
          </>
        ) : null}
        <div className="absolute -top-1 w-1 h-4 rounded-full bg-accent" style={{ left: `calc(${pos(value)} - 2px)` }} />
      </div>
      {isGemini ? (
        <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-subtle/60" /> Off-topic ≈ 0.50–0.60</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-good" /> On-topic ≈ 0.72+</span>
          <span className="flex items-center gap-1.5"><span className="w-1 h-2.5 rounded-sm bg-accent" /> Your threshold</span>
        </p>
      ) : (
        <p className="mt-2.5 text-[11px] text-muted">Local fallback embeddings score lower; around 0.15 works well.</p>
      )}
    </div>
  );
}

function Toggle({ checked, onChange, title, description }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 rounded-xl border border-line px-4 py-3 text-left hover:border-line-strong cursor-pointer"
    >
      <span className={`relative mt-0.5 w-9 h-5 rounded-full shrink-0 transition-colors ${checked ? 'bg-good' : 'bg-line-strong'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-[left] ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
      <span>
        <span className="block text-sm font-medium text-fg">{title}</span>
        <span className="block text-xs text-muted">{description}</span>
      </span>
    </button>
  );
}

/** Full system prompt editor + the fixed output format the app appends after it. */
function PromptSection({ value, defaultValue, placeholders, contract, onChange }) {
  const isDefault = value === defaultValue;
  const missing = Object.keys(placeholders).filter((token) => !value.includes(token));
  return (
    <Section
      icon="pencil"
      title="System prompt"
      description="Everything the assistant is told before each question. Edit freely; the default is hardened against off-topic questions and prompt extraction."
      badge={isDefault ? <Badge tone="good" icon="check">Default</Badge> : <Badge tone="outline" icon="pencil">Customized</Badge>}
    >
      <textarea
        value={value}
        maxLength={MAX_PROMPT}
        rows={22}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        aria-label="System prompt"
        className={`${inputClass} resize-y font-mono text-[12.5px] leading-relaxed`}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-subtle">Append:</span>
        {PROMPT_SNIPPETS.map((snippet) => (
          <button
            key={snippet}
            type="button"
            disabled={value.includes(snippet)}
            onClick={() => onChange(`${value.trimEnd()}\n- ${snippet}`)}
            className="px-2.5 py-1 rounded-full border border-line text-[11px] text-muted hover:text-fg hover:border-line-strong disabled:opacity-40 cursor-pointer"
          >
            + {snippet}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-subtle">
        <span className="flex flex-wrap items-center gap-1.5">
          Placeholders:
          {Object.entries(placeholders).map(([token, meaning]) => (
            <code
              key={token}
              title={meaning}
              className={`px-1.5 py-0.5 rounded font-mono ${missing.includes(token) ? 'bg-accent-soft text-accent-text' : 'bg-surface-2 text-fg'}`}
            >
              {token}
            </code>
          ))}
        </span>
        {missing.length ? <span className="text-accent-text">Not used: {missing.join(', ')} (that setting won't apply)</span> : null}
        <span className="ml-auto tabular-nums">{value.length.toLocaleString()} / {MAX_PROMPT.toLocaleString()}</span>
        <Button variant="ghost" size="sm" disabled={isDefault} onClick={() => onChange(defaultValue)}>
          <Icon name="refresh" size={12} /> Restore default prompt
        </Button>
      </div>

      <details className="group mt-4 rounded-xl border border-line">
        <summary className="flex items-center gap-2 px-3.5 py-2.5 text-xs text-muted hover:text-fg cursor-pointer list-none">
          <Icon name="chevron" size={13} className="transition-transform group-open:rotate-180" />
          Output format added by the app (not editable)
          <Badge tone="outline" className="ml-auto">Required to render replies</Badge>
        </summary>
        <pre className="whitespace-pre-wrap border-t border-line bg-surface-2/60 px-4 py-3 text-xs leading-relaxed text-muted font-mono rounded-b-xl">
          {contract}
        </pre>
      </details>
    </Section>
  );
}
