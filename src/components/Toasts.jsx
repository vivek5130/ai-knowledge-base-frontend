import { Icon } from './ui';

export function Toasts({ toasts, onRemove }) {
  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 sm:w-96">
      {toasts.map((toast) => {
        const error = toast.type === 'error';
        return (
          <div
            key={toast.id}
            role={error ? 'alert' : 'status'}
            className="flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-lg shadow-black/5"
          >
            <span className={`mt-0.5 grid place-items-center w-5 h-5 rounded-full ${error ? 'bg-accent-soft text-accent-text' : 'bg-good-soft text-good-text'}`}>
              <Icon name={error ? 'alert' : 'check'} size={12} strokeWidth={2.4} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-fg">{toast.message}</p>
              {toast.requestId ? (
                <p className="mt-0.5 font-mono text-[11px] text-subtle truncate">ref {toast.requestId}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onRemove(toast.id)}
              aria-label="Dismiss"
              className="text-subtle hover:text-fg cursor-pointer"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
