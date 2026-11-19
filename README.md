# AI Knowledge Inbox — Frontend

React 19 + Vite + Tailwind v4. Dark mode by default (light / system available in the sidebar).
<img width="1914" height="939" alt="image" src="https://github.com/user-attachments/assets/6a03a0d6-d1ad-4bfc-b6ab-78a1ed0a3876" />
<img width="1915" height="928" alt="image" src="https://github.com/user-attachments/assets/b0664fba-4bd2-4e5b-8392-e40a072b9478" />

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
