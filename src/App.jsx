import { useCallback, useEffect, useState } from 'react';
import { api } from './api/client';
import { Sidebar } from './components/Sidebar';
import { Toasts } from './components/Toasts';
import { Button, Icon } from './components/ui';
import { AskView } from './features/ask/AskView';
import { AgentView } from './features/agent/AgentView';
import { InsightsView } from './features/insights/InsightsView';
import { LibraryView } from './features/library/LibraryView';
import { FALLBACK_OPTIONS, describeIndex } from './features/library/sourceTypes';
import { useLocalStorage } from './hooks/useLocalStorage';
import { usePolling } from './hooks/usePolling';
import { useTheme } from './hooks/useTheme';
import { useToast } from './hooks/useToast';

const VIEWS = {
  ask: { title: 'Ask', subtitle: 'Grounded answers from your saved content' },
  library: { title: 'Library', subtitle: 'Notes and links in your knowledge base' },
  agent: { title: 'Agent', subtitle: 'Instructions, tone, retrieval and guardrails' },
  insights: { title: 'Insights', subtitle: 'Health, latency and answer quality' },
};

/** Current view lives in the URL hash (#/ask, #/library, #/insights) so refresh/back work. */
function useHashView() {
  const read = () => {
    const id = window.location.hash.replace(/^#\/?/, '');
    return VIEWS[id] ? id : 'ask';
  };
  const [view, setView] = useState(read);
  useEffect(() => {
    const onHash = () => setView(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const navigate = useCallback((id) => {
    window.location.hash = `/${id}`;
  }, []);
  return [view, navigate];
}

/** Map a stored query log (GET /queries/{id}) to the same shape as a live POST /query result. */
function logToResult(log) {
  const fallback = log.llm_model === 'extractive' || log.llm_model === 'none';
  return {
    query_id: log.id,
    answer: log.answer,
    sources: log.sources,
    evaluation: log.evaluation,
    trace: log.trace,
    model: { llm: log.llm_model ?? 'unknown', embedding: log.embedding_model ?? 'unknown', fallback },
    feedback: log.feedback,
    status: log.status ?? 'answered',
    clarifying_question: log.guardrail?.clarifying_question ?? null,
    guardrail: log.guardrail ?? { stage: 'none' },
    escalated: log.escalated,
    escalation_reason: log.escalation_reason,
  };
}

let turnSeq = 0;

export default function App() {
  const theme = useTheme();
  const [view, navigate] = useHashView();
  const [collapsed, setCollapsed] = useLocalStorage('sidebar-collapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { toasts, addToast, toastError, removeToast } = useToast();

  // ---- library ----
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState(null);

  const refreshItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const data = await api.listItems();
      setItems(data.items);
      setItemsError(null);
    } catch (err) {
      setItemsError(err);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshItems();
  }, [refreshItems]);

  const options = usePolling(api.ingestOptions, 0).data ?? FALLBACK_OPTIONS;

  /** kind 'json' (note/url) or 'file'. Returns the error (for inline display) or null on success. */
  const saveItem = useCallback(
    async (kind, payload) => {
      try {
        const item =
          kind === 'file' ? await api.ingestFile(payload.file, payload.chunking, payload.title) : await api.ingest(payload);
        setItems((prev) => [item, ...prev]);
        addToast(`Saved “${item.title ?? 'Untitled'}” · ${item.chunk_count} chunk${item.chunk_count === 1 ? '' : 's'} indexed`);
        return null;
      } catch (err) {
        return err;
      }
    },
    [addToast],
  );

  /** PUT /items/{id}; toast says how many chunks were re-embedded vs reused (hash diff). */
  const updateItem = useCallback(
    async (id, payload) => {
      try {
        const item = await api.updateItem(id, payload);
        setItems((prev) => prev.map((existing) => (existing.id === id ? item : existing)));
        addToast(`Re-indexed “${item.title ?? 'Untitled'}”: ${describeIndex(item.index)}`);
        return null;
      } catch (err) {
        return err;
      }
    },
    [addToast],
  );

  /** Toggle whether a source is used as context (optimistic, reverted on error). */
  const setActive = useCallback(
    async (id, isActive) => {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_active: isActive } : item)));
      try {
        await api.setActive(id, isActive);
      } catch (err) {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_active: !isActive } : item)));
        toastError(err);
      }
    },
    [toastError],
  );

  const replaceFile = useCallback(
    async (id, file, chunking) => {
      try {
        const item = await api.replaceFile(id, file, chunking);
        setItems((prev) => prev.map((existing) => (existing.id === id ? item : existing)));
        addToast(`Replaced with ${item.file_name}: ${describeIndex(item.index)}`);
        return null;
      } catch (err) {
        return err;
      }
    },
    [addToast],
  );

  const deleteItems = useCallback(
    async (ids) => {
      try {
        const result = await api.deleteItems(ids);
        const gone = new Set([...result.deleted, ...result.not_found]);
        setItems((prev) => prev.filter((item) => !gone.has(item.id)));
        addToast(`Deleted ${result.deleted.length} item${result.deleted.length === 1 ? '' : 's'}`);
        return true;
      } catch (err) {
        toastError(err);
        return false;
      }
    },
    [addToast, toastError],
  );

  const deleteItem = useCallback(
    async (id) => {
      try {
        await api.deleteItem(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
        addToast('Item deleted');
        return true;
      } catch (err) {
        toastError(err);
        return false;
      }
    },
    [addToast, toastError],
  );

  // ---- health + recent questions (sidebar) ----
  const health = usePolling(api.ready, 20000);
  const recent = usePolling(useCallback(() => api.listQueries(15), []), 0);
  const refreshRecent = recent.refresh;

  // ---- ask thread ----
  const [thread, setThread] = useState([]);

  const runQuestion = useCallback(
    async (key, question, topK) => {
      try {
        const result = await api.ask(question, topK);
        setThread((prev) => prev.map((turn) => (turn.key === key ? { ...turn, status: 'done', result: { ...result, feedback: null } } : turn)));
        refreshRecent();
      } catch (err) {
        setThread((prev) => prev.map((turn) => (turn.key === key ? { ...turn, status: 'error', error: err } : turn)));
      }
    },
    [refreshRecent],
  );

  const ask = useCallback(
    (question, topK) => {
      const key = `t${++turnSeq}`;
      setThread((prev) => [...prev, { key, question, topK, status: 'loading', startedAt: Date.now() }]);
      runQuestion(key, question, topK);
    },
    [runQuestion],
  );

  const retry = useCallback(
    (turn) => {
      setThread((prev) => prev.map((t) => (t.key === turn.key ? { ...t, status: 'loading', startedAt: Date.now(), error: null } : t)));
      runQuestion(turn.key, turn.question, turn.topK);
    },
    [runQuestion],
  );

  const giveFeedback = useCallback(
    async (turn, rating) => {
      const id = turn.result.query_id;
      const setRating = (value) =>
        setThread((prev) => prev.map((t) => (t.key === turn.key ? { ...t, result: { ...t.result, feedback: value } } : t)));
      const previous = turn.result.feedback;
      setRating(rating); // optimistic
      try {
        await api.feedback(id, rating);
        if (rating) addToast('Thanks — feedback recorded');
        refreshRecent();
      } catch (err) {
        setRating(previous);
        toastError(err);
      }
    },
    [addToast, toastError, refreshRecent],
  );

  // ---- delete chat: clears the thread and removes its questions from history (server side) ----
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const chatBusy = thread.some((turn) => turn.status === 'loading');

  const deleteChat = useCallback(async () => {
    const ids = thread.map((turn) => turn.result?.query_id).filter(Boolean);
    setDeletingChat(true);
    try {
      if (ids.length) await api.deleteQueries(ids);
      setThread([]);
      setConfirmDelete(false);
      addToast(ids.length ? `Chat deleted · ${ids.length} question${ids.length === 1 ? '' : 's'} removed from history` : 'Chat cleared');
      refreshRecent();
    } catch (err) {
      toastError(err);
    } finally {
      setDeletingChat(false);
    }
  }, [thread, addToast, toastError, refreshRecent]);

  /** Sidebar: delete one question from history (and from the open chat, if it's there). */
  const deleteRecent = useCallback(
    async (id) => {
      try {
        await api.deleteQueries([id]);
        setThread((prev) => prev.filter((turn) => turn.result?.query_id !== id));
        addToast('Question deleted from history');
        refreshRecent();
        return true;
      } catch (err) {
        toastError(err);
        return false;
      }
    },
    [addToast, toastError, refreshRecent],
  );

  /** Sidebar: clear the whole history; the open chat referenced it, so it's cleared too. */
  const clearHistory = useCallback(async () => {
    try {
      const { deleted } = await api.clearQueries();
      setThread((prev) => prev.filter((turn) => turn.status === 'loading'));
      addToast(`History cleared · ${deleted} question${deleted === 1 ? '' : 's'} deleted`);
      refreshRecent();
    } catch (err) {
      toastError(err);
    }
  }, [addToast, toastError, refreshRecent]);

  /** Flag an answer for human review; it then shows in Insights > Needs review. */
  const escalate = useCallback(
    async (turn) => {
      try {
        await api.escalate(turn.result.query_id, 'Flagged by user from the answer view');
        setThread((prev) =>
          prev.map((t) => (t.key === turn.key ? { ...t, result: { ...t.result, escalated: true } } : t)),
        );
        addToast('Escalated — added to the review queue');
        refreshRecent();
      } catch (err) {
        toastError(err);
      }
    },
    [addToast, toastError, refreshRecent],
  );

  const openQuery = useCallback(
    async (id) => {
      setMobileOpen(false);
      navigate('ask');
      const existing = thread.find((turn) => turn.result?.query_id === id);
      if (existing) {
        document.getElementById(`src-${existing.key}-1`)?.closest('article')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      try {
        const log = await api.getQuery(id);
        setThread((prev) => [
          ...prev,
          { key: `t${++turnSeq}`, question: log.question, topK: log.top_k, status: 'done', result: logToResult(log) },
        ]);
      } catch (err) {
        toastError(err);
      }
    },
    [navigate, thread, toastError],
  );

  const goto = useCallback(
    (id) => {
      setMobileOpen(false);
      navigate(id);
    },
    [navigate],
  );

  const status = sidebarStatus(health);
  const meta = VIEWS[view];

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>

      <Sidebar
        view={view}
        onNavigate={goto}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        itemCount={items.length}
        recentQueries={recent.data?.queries ?? []}
        onOpenQuery={openQuery}
        onDeleteQuery={deleteRecent}
        onClearHistory={clearHistory}
        status={status}
        theme={theme}
      />

      <div className={`transition-[padding] duration-200 ease-out ${collapsed ? 'md:pl-[68px]' : 'md:pl-64'}`}>
        <header className="sticky top-0 z-20 h-14 flex items-center gap-3 px-4 sm:px-6 border-b border-line bg-bg/80 backdrop-blur-md">
          <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Icon name="menu" size={18} />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[15px] font-semibold text-fg leading-tight">{meta.title}</h1>
            <p className="text-xs text-subtle truncate hidden sm:block">{meta.subtitle}</p>
          </div>
          {view === 'ask' && thread.length > 0 ? (
            confirmDelete ? (
              <div className="flex items-center gap-2" role="group" aria-label="Confirm delete chat">
                <span className="hidden md:inline text-xs text-muted">Delete this chat and remove its questions from history?</span>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={deletingChat}>Cancel</Button>
                <Button size="sm" loading={deletingChat} onClick={deleteChat}>
                  {deletingChat ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} disabled={chatBusy} title="Delete this chat">
                  <Icon name="trash" size={14} /> <span className="hidden sm:inline">Delete chat</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setThread([])} disabled={chatBusy} title="Start a new chat (history is kept)">
                  <Icon name="plus" size={14} /> New chat
                </Button>
              </div>
            )
          ) : null}
          {view === 'library' ? (
            <span className="text-xs text-subtle tabular-nums">{items.length} item{items.length === 1 ? '' : 's'}</span>
          ) : null}
        </header>

        <main id="main">
          {view === 'ask' ? (
            <AskView
              thread={thread}
              onAsk={ask}
              onRetry={retry}
              onFeedback={giveFeedback}
              onEscalate={escalate}
              itemCount={items.filter((item) => item.is_active).length}
              onGoLibrary={() => goto('library')}
              onOpenAgent={() => goto('agent')}
            />
          ) : null}
          {view === 'library' ? (
            <LibraryView
              items={items}
              loading={itemsLoading}
              error={itemsError}
              onRefresh={refreshItems}
              options={options}
              onSave={saveItem}
              onUpdate={updateItem}
              onReplaceFile={replaceFile}
              onDelete={deleteItem}
              onDeleteMany={deleteItems}
              onSetActive={setActive}
            />
          ) : null}
          {view === 'agent' ? <AgentView onSaved={(message) => addToast(message)} onError={toastError} /> : null}
          {view === 'insights' ? <InsightsView onOpenQuery={openQuery} /> : null}
        </main>
      </div>

      <Toasts toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function sidebarStatus({ data, error, loading }) {
  if (loading && !data) return { tone: 'warn', label: 'Connecting…', detail: 'Checking API' };
  if (error || !data) return { tone: 'bad', label: 'API offline', detail: 'Start the backend on :8000' };
  if (data.status !== 'ok') return { tone: 'bad', label: 'Degraded', detail: 'Database check failed' };
  if (!data.providers.gemini_enabled) return { tone: 'warn', label: 'Fallback mode', detail: 'No Gemini key · local search' };
  return { tone: 'good', label: 'All systems normal', detail: `Gemini · ${data.providers.llm_model}` };
}
