# AI Knowledge Inbox — Frontend

React 19 + Vite + Tailwind v4. Dark mode by default (light / system available in the sidebar).

```bash
npm install
npm run dev        # http://localhost:5173 (expects the API on http://localhost:8000)
npm run build      # production build in dist/
npm run lint
```

Set `VITE_API_BASE` to point at a different backend URL.

## Structure

```
src/
├── api/client.js          # fetch wrapper: X-Request-ID, backend error shape -> ApiError
├── components/            # Sidebar (collapsible), Toasts, ui primitives (Button, Badge, Icon...)
├── hooks/                 # useTheme, useLocalStorage, usePolling, useToast
├── lib/format.js          # dates, durations, percentages
└── features/
    ├── ask/               # chat thread, answer states, collapsible sources, trace waterfall
    ├── library/           # add note / URL / file, chunking options, edit & re-index, multi-select
    ├── agent/             # system prompt, tone, retrieval and behaviour settings
    └── insights/          # health, outcomes, review queue, latency, offline eval
```

State lives in `App.jsx` (items, thread) and small hooks; views are routed by the URL hash
(`#/ask`, `#/library`, `#/agent`, `#/insights`).
