// Thin fetch wrapper: one place for base URL, request ids and the backend's error shape.

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

/** Error carrying the backend's {code, message, details, request_id} for display + debugging. */
export class ApiError extends Error {
  constructor({ message, code = 'UNKNOWN', details = null, requestId = null, status = 0 }) {
    super(message);
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.status = status;
  }
}

function newRequestId() {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/-/g, '').slice(0, 16);
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const isForm = body instanceof FormData; // browser sets the multipart boundary itself
  // Sent to the backend so its logs, trace and error body all use the same id.
  const requestId = newRequestId();
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      signal,
      headers: isForm ? { 'X-Request-ID': requestId } : { 'Content-Type': 'application/json', 'X-Request-ID': requestId },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError({
      message: 'Cannot reach the API. Is the backend running on port 8000?',
      code: 'NETWORK_ERROR',
      requestId,
    });
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error ?? {};
    throw new ApiError({
      message: error.message || `Request failed (${response.status})`,
      code: error.code,
      details: error.details,
      requestId: error.request_id || response.headers.get('X-Request-ID') || requestId,
      status: response.status,
    });
  }
  return data;
}

export const api = {
  ready: () => request('/ready'),
  metrics: () => request('/metrics'),
  latestEval: () => request('/eval/latest'),

  ingestOptions: () => request('/ingest/options'),
  listItems: () => request('/items'),
  getItem: (id) => request(`/items/${id}`),
  ingest: (payload) => request('/ingest', { method: 'POST', body: payload }),
  /** file: File, chunking: {strategy, size, overlap}, title?: string */
  ingestFile: (file, chunking, title) => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    Object.entries(chunking).forEach(([key, value]) => form.append(key, String(value)));
    return request('/ingest/file', { method: 'POST', body: form });
  },
  /** New version of a doc/PDF into the same item; only changed chunks are re-embedded. */
  replaceFile: (id, file, chunking) => {
    const form = new FormData();
    form.append('file', file);
    Object.entries(chunking ?? {}).forEach(([key, value]) => form.append(key, String(value)));
    return request(`/items/${id}/file`, { method: 'PUT', body: form });
  },
  updateItem: (id, payload) => request(`/items/${id}`, { method: 'PUT', body: payload }),
  setActive: (id, isActive) => request(`/items/${id}/active`, { method: 'PATCH', body: { is_active: isActive } }),
  deleteItem: (id) => request(`/items/${id}`, { method: 'DELETE' }),
  deleteItems: (ids) => request('/items/bulk-delete', { method: 'POST', body: { ids } }),

  getAgentSettings: () => request('/agent/settings'),
  updateAgentSettings: (settings) => request('/agent/settings', { method: 'PUT', body: settings }),

  ask: (question, topK) => request('/query', { method: 'POST', body: { question, top_k: topK } }),
  listQueries: (limit = 20, escalated) =>
    request(`/queries?limit=${limit}${escalated === undefined ? '' : `&escalated=${escalated}`}`),
  clearQueries: () => request('/queries', { method: 'DELETE' }),
  deleteQueries: (ids) => request('/queries/bulk-delete', { method: 'POST', body: { ids } }),
  escalate: (id, reason) => request(`/queries/${id}/escalate`, { method: 'POST', body: { reason } }),
  getQuery: (id) => request(`/queries/${id}`),
  feedback: (id, rating) => request(`/queries/${id}/feedback`, { method: 'POST', body: { rating } }),
};
