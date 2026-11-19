import { useEffect, useRef, useState } from 'react';
import { Button, Icon } from '../../components/ui';
import { AnswerTurn } from './AnswerTurn';

const SUGGESTIONS = [
  'Summarize the key points across my notes',
  'What did I save about deadlines or dates?',
  'Which links should I read first?',
];

/** Chat-style thread of questions and grounded answers, with the composer pinned at the bottom. */
export function AskView({ thread, onAsk, onRetry, onFeedback, onEscalate, itemCount, onGoLibrary, onOpenAgent }) {
  const [question, setQuestion] = useState('');
  const composerRef = useRef(null);

  /** 'Reply' on a clarifying question: focus the composer so the user can answer it. */
  function reply() {
    composerRef.current?.focus();
  }
  const endRef = useRef(null);
  const busy = thread.some((turn) => turn.status === 'loading');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [thread.length]);

  function submit(text = question) {
    const value = text.trim();
    if (!value || busy) return;
    onAsk(value); // passages per answer + threshold come from the Agent page
    setQuestion('');
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-3.5rem)]">
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {thread.length === 0 ? (
          <Welcome itemCount={itemCount} onPick={submit} onGoLibrary={onGoLibrary} />
        ) : (
          <div className="flex flex-col gap-8">
            {thread.map((turn) => (
              <AnswerTurn
                key={turn.key}
                turn={turn}
                onRetry={onRetry}
                onFeedback={onFeedback}
                onEscalate={onEscalate}
                onReply={reply}
                onGoLibrary={onGoLibrary}
              />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <Composer
        value={question}
        onChange={setQuestion}
        onSubmit={() => submit()}
        onOpenAgent={onOpenAgent}
        busy={busy}
        disabled={itemCount === 0}
        inputRef={composerRef}
      />
    </div>
  );
}

function Welcome({ itemCount, onPick, onGoLibrary }) {
  return (
    <div className="pt-10 sm:pt-20 text-center">
      <span className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-fg text-bg mb-5">
        <Icon name="ask" size={22} />
      </span>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-fg">
        What would you like to know<span className="text-accent">?</span>
      </h1>
      <p className="mt-2 text-sm text-muted max-w-md mx-auto">
        Ask anything about the notes, links and documents you’ve saved. I’ll answer from them and show you exactly where each answer came from.
      </p>

      {itemCount === 0 ? (
        <div className="mt-8">
          <Button onClick={onGoLibrary}>
            <Icon name="plus" size={16} /> Add your first note or link
          </Button>
        </div>
      ) : (
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => onPick(text)}
              className="px-3.5 py-2 rounded-full border border-line bg-surface text-sm text-muted hover:text-fg hover:border-line-strong transition-colors cursor-pointer"
            >
              {text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Composer({ value, onChange, onSubmit, busy, disabled, inputRef, onOpenAgent }) {
  const ref = inputRef;

  // Auto-grow up to ~6 lines.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [value, ref]);

  return (
    <div className="sticky bottom-0 bg-gradient-to-t from-bg via-bg to-bg/0 pt-6 pb-4 px-4 sm:px-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="max-w-3xl mx-auto rounded-2xl border border-line bg-surface shadow-lg shadow-black/[0.04] focus-within:border-line-strong focus-within:ring-4 focus-within:ring-accent/10 transition"
      >
        <label htmlFor="question" className="sr-only">Your question</label>
        <textarea
          id="question"
          ref={ref}
          rows={1}
          value={value}
          maxLength={1000}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder={disabled ? 'Save something in the Library first…' : 'Ask a question about your notes…'}
          className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] text-fg placeholder:text-subtle focus:outline-none disabled:cursor-not-allowed"
        />
        <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-1">
          <span className="flex items-center gap-2 text-xs text-subtle">
            <span className="hidden sm:inline">Enter to send · Shift+Enter for a new line</span>
            <button
              type="button"
              onClick={onOpenAgent}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:text-fg hover:bg-surface-2 cursor-pointer"
              title="Tone, instructions, passages per answer and relevance threshold"
            >
              <Icon name="sliders" size={12} /> Agent settings
            </button>
          </span>
          <Button
            type="submit"
            size="icon"
            loading={busy}
            disabled={disabled || !value.trim()}
            aria-label="Ask"
            className="rounded-xl"
          >
            {busy ? null : <Icon name="send" size={17} strokeWidth={2.2} />}
          </Button>
        </div>
      </form>
    </div>
  );
}
