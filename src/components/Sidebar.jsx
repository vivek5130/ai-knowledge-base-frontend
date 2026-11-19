import { useState } from 'react';
import { Icon } from './ui';

const NAV = [
  { id: 'ask', label: 'Ask', icon: 'ask' },
  { id: 'library', label: 'Library', icon: 'library' },
  { id: 'agent', label: 'Agent', icon: 'sliders' },
  { id: 'insights', label: 'Insights', icon: 'insights' },
];

const THEMES = [
  { value: 'light', icon: 'sun', label: 'Light' },
  { value: 'system', icon: 'monitor', label: 'System' },
  { value: 'dark', icon: 'moon', label: 'Dark' },
];

const CONFIDENCE_DOT = { high: 'bg-good', medium: 'bg-subtle', low: 'bg-accent' };

/**
 * Collapsible on desktop (icons only), slide-over drawer on mobile.
 * `collapsed` only applies from md up; on phones the drawer is always full width.
 */
export function Sidebar({
  view,
  onNavigate,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  itemCount,
  recentQueries,
  onOpenQuery,
  onDeleteQuery,
  onClearHistory,
  status,
  theme,
}) {
  const hide = collapsed ? 'md:hidden' : '';

  return (
    <>
      <div
        onClick={onCloseMobile}
        className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] md:hidden transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      />
      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-40 flex flex-col w-72 border-r border-line bg-surface transition-[width,transform] duration-200 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${collapsed ? 'md:w-[68px]' : 'md:w-64'}`}
      >
        {/* Brand + collapse */}
        <div className={`flex items-center h-14 px-3 gap-2 border-b border-line ${collapsed ? 'md:justify-center' : ''}`}>
          <button
            type="button"
            onClick={() => onNavigate('ask')}
            className={`flex items-center gap-2.5 min-w-0 flex-1 rounded-lg p-1 cursor-pointer ${collapsed ? 'md:flex-none' : ''}`}
            title="Knowledge Inbox"
          >
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-fg text-bg shrink-0">
              <Icon name="inbox" size={17} strokeWidth={2} />
            </span>
            <span className={`min-w-0 text-left ${hide}`}>
              <span className="block text-sm font-semibold text-fg leading-tight truncate">
                Knowledge<span className="text-accent">.</span>Inbox
              </span>
              <span className="block text-[11px] text-subtle leading-tight">RAG workspace</span>
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`hidden md:grid place-items-center w-8 h-8 rounded-lg text-subtle hover:text-fg hover:bg-surface-2 cursor-pointer ${hide}`}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <Icon name="panel" size={16} />
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden grid place-items-center w-8 h-8 rounded-lg text-subtle hover:text-fg hover:bg-surface-2 cursor-pointer"
            aria-label="Close menu"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden md:grid place-items-center mx-auto mt-3 w-9 h-9 rounded-lg text-subtle hover:text-fg hover:bg-surface-2 cursor-pointer"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <Icon name="panel" size={16} />
          </button>
        ) : null}

        {/* Navigation */}
        <nav className="px-3 pt-3 flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
                className={`group relative flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-medium transition-colors cursor-pointer
                  ${collapsed ? 'md:justify-center md:px-0' : ''}
                  ${active ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg hover:bg-surface-2/60'}`}
              >
                {active ? <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-accent" /> : null}
                <Icon name={item.icon} size={18} className={active ? 'text-accent' : ''} />
                <span className={`flex-1 text-left ${hide}`}>{item.label}</span>
                {item.id === 'library' && itemCount > 0 ? (
                  <span className={`text-[11px] tabular-nums text-subtle ${hide}`}>{itemCount}</span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Recent questions */}
        <div className={`flex-1 min-h-0 mt-5 flex flex-col ${hide}`}>
          <RecentHeader count={recentQueries.length} onClear={onClearHistory} />
          <div className="thin-scrollbar flex-1 overflow-y-auto px-3 pb-3">
            {recentQueries.length === 0 ? (
              <p className="px-3 py-2 text-xs text-subtle">Questions you ask will show up here.</p>
            ) : (
              recentQueries.slice(0, 12).map((query) => (
                <RecentItem key={query.id} query={query} onOpen={onOpenQuery} onDelete={onDeleteQuery} />
              ))
            )}
          </div>
        </div>
        {collapsed ? <div className="hidden md:block flex-1" /> : null}

        {/* Status + theme */}
        <div className="border-t border-line p-3 flex flex-col gap-2.5">
          <StatusPill status={status} collapsed={collapsed} />
          <ThemeSwitch theme={theme} collapsed={collapsed} />
        </div>
      </aside>
    </>
  );
}

function StatusPill({ status, collapsed }) {
  const { tone, label, detail } = status;
  const dot = { good: 'bg-good', warn: 'bg-subtle', bad: 'bg-accent' }[tone];
  return (
    <div
      title={`${label} — ${detail}`}
      className={`flex items-center gap-2.5 px-3 h-9 rounded-lg bg-surface-2 ${collapsed ? 'md:justify-center md:px-0' : ''}`}
    >
      <span className="relative flex w-2 h-2 shrink-0">
        {tone === 'good' ? <span className={`absolute inset-0 rounded-full ${dot} opacity-60 animate-ping-slow`} /> : null}
        <span className={`relative w-2 h-2 rounded-full ${dot}`} />
      </span>
      <span className={`min-w-0 ${collapsed ? 'md:hidden' : ''}`}>
        <span className="block text-xs font-medium text-fg truncate">{label}</span>
        <span className="block text-[11px] text-subtle truncate">{detail}</span>
      </span>
    </div>
  );
}

function ThemeSwitch({ theme, collapsed }) {
  const index = THEMES.findIndex((option) => option.value === theme.mode);
  const current = THEMES[index] ?? THEMES[1];
  const cycle = () => theme.setMode(THEMES[(index + 1) % THEMES.length].value);

  return (
    <>
      {collapsed ? (
        <button
          type="button"
          onClick={cycle}
          title={`Theme: ${current.label} (click to change)`}
          aria-label={`Theme: ${current.label}`}
          className="hidden md:grid place-items-center mx-auto w-9 h-9 rounded-lg text-muted hover:text-fg hover:bg-surface-2 cursor-pointer"
        >
          <Icon name={current.icon} size={16} />
        </button>
      ) : null}
      <div
        role="radiogroup"
        aria-label="Color theme"
        className={`grid grid-cols-3 p-0.5 rounded-lg bg-surface-2 border border-line ${collapsed ? 'md:hidden' : ''}`}
      >
        {THEMES.map((option) => {
          const active = option.value === theme.mode;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => theme.setMode(option.value)}
              className={`flex items-center justify-center gap-1.5 h-7 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                active ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
              }`}
            >
              <Icon name={option.icon} size={13} />
              {option.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** "Recent questions" heading with a two-step "Clear all". */
function RecentHeader({ count, onClear }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function clear() {
    setBusy(true);
    await onClear();
    setBusy(false);
    setConfirming(false);
  }

  return (
    <div className="flex items-center justify-between px-6 mb-1.5 min-h-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle">Recent questions</p>
      {count === 0 ? null : confirming ? (
        <span className="flex items-center gap-1 text-[11px]">
          <button type="button" onClick={clear} disabled={busy} className="font-medium text-accent-text hover:underline cursor-pointer disabled:opacity-50">
            {busy ? 'Clearing…' : 'Clear all'}
          </button>
          <span className="text-subtle">·</span>
          <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="text-muted hover:text-fg cursor-pointer">
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-[11px] text-subtle hover:text-accent-text cursor-pointer"
          title="Delete all questions from history"
        >
          Clear
        </button>
      )}
    </div>
  );
}

/** One recent question: click to reopen; trash on hover, then confirm with a second click. */
function RecentItem({ query, onOpen, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const ok = await onDelete(query.id);
    if (!ok) {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-soft text-[13px]">
        <span className="flex-1 truncate text-fg">Delete this question?</span>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          aria-label="Confirm delete"
          className="grid place-items-center w-6 h-6 rounded-md text-accent-text hover:bg-accent hover:text-white cursor-pointer disabled:opacity-50"
        >
          <Icon name="check" size={13} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          aria-label="Cancel delete"
          className="grid place-items-center w-6 h-6 rounded-md text-muted hover:text-fg hover:bg-surface-2 cursor-pointer"
        >
          <Icon name="x" size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="group relative flex items-center rounded-lg hover:bg-surface-2 focus-within:bg-surface-2">
      <button
        type="button"
        onClick={() => onOpen(query.id)}
        title={query.question}
        className="flex-1 min-w-0 flex items-center gap-2.5 pl-3 pr-9 py-2 text-left text-[13px] text-muted group-hover:text-fg cursor-pointer"
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${CONFIDENCE_DOT[query.confidence] ?? 'bg-subtle'}`} />
        <span className="truncate">{query.question}</span>
      </button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Delete question: ${query.question}`}
        title="Delete from history"
        className="absolute right-1.5 grid place-items-center w-6 h-6 rounded-md text-subtle hover:text-accent-text hover:bg-accent-soft opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
      >
        <Icon name="trash" size={13} />
      </button>
    </div>
  );
}
