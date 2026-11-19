// Small, dependency-free UI primitives styled with the design tokens in index.css.

const ICONS = {
  ask: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  library: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
  insights: (
    <>
      <path d="M3 3v18h18" />
      <path d="M8 16v-4M13 16V8M18 16v-7" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />,
  monitor: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  panel: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  send: <path d="M5 12h14M13 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />,
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </>
  ),
  note: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </>
  ),
  flag: (
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
    </>
  ),
  right: <path d="m9 18 6-6-6-6" />,
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
  upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
  sliders: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  up: <path d="M7 10v12M15 5.9 14 10h5.8a2 2 0 0 1 2 2.3l-1.4 8a2 2 0 0 1-2 1.7H7V10l4-8a3 3 0 0 1 3 3.9z" />,
  down: <path d="M17 14V2M9 18.1 10 14H4.2a2 2 0 0 1-2-2.3l1.4-8A2 2 0 0 1 5.6 2H17v12l-4 8a3 3 0 0 1-3-3.9z" />,
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  refresh: <path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  external: <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  inbox: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z" />
    </>
  ),
  flask: <path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21.5h11.6a2 2 0 0 0 1.7-3L14 9V3M7 15h10" />,
};

export function Icon({ name, size = 16, className = '', strokeWidth = 1.8 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

const BUTTON_VARIANTS = {
  primary: 'bg-accent text-white hover:bg-accent-hover shadow-sm',
  inverse: 'bg-fg text-bg hover:opacity-85',
  secondary: 'bg-surface text-fg border border-line hover:bg-surface-2 hover:border-line-strong',
  ghost: 'text-muted hover:text-fg hover:bg-surface-2',
  danger: 'text-accent-text hover:bg-accent-soft',
};

const BUTTON_SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-lg justify-center',
  'icon-sm': 'h-7 w-7 rounded-md justify-center',
};

export function Button({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center font-medium transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer ${FOCUS} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? <Spinner size={14} /> : null}
      {children}
    </button>
  );
}

export function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon, action }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon ? (
          <span className="grid place-items-center w-7 h-7 rounded-lg bg-surface-2 text-muted">
            <Icon name={icon} size={15} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg truncate">{title}</h2>
          {subtitle ? <p className="text-xs text-subtle truncate">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

const BADGE_TONES = {
  neutral: 'bg-surface-2 text-muted border-line',
  good: 'bg-good-soft text-good-text border-transparent',
  accent: 'bg-accent-soft text-accent-text border-transparent',
  outline: 'bg-transparent text-muted border-line',
};

export function Badge({ tone = 'neutral', icon, className = '', children, title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 h-6 px-2 rounded-md border text-[11px] font-medium whitespace-nowrap ${BADGE_TONES[tone]} ${className}`}
    >
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}

/** Confidence uses status colors + a text label, never color alone. */
export function ConfidenceBadge({ confidence }) {
  if (!confidence) return null;
  const tone = { high: 'good', medium: 'neutral', low: 'accent' }[confidence];
  const icon = { high: 'shield', medium: 'activity', low: 'alert' }[confidence];
  return (
    <Badge tone={tone} icon={icon} title="Based on how similar the best passage is to your question">
      {confidence[0].toUpperCase() + confidence.slice(1)} confidence
    </Badge>
  );
}

export function Spinner({ size = 16, className = '' }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
      className={`inline-block rounded-full border-2 border-current border-t-transparent animate-spin-slow ${className}`}
    />
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-md ${className}`} aria-hidden="true" />;
}

export function EmptyState({ icon = 'inbox', title, children, action }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-12">
      <span className="grid place-items-center w-12 h-12 rounded-2xl bg-surface-2 text-muted mb-4">
        <Icon name={icon} size={22} />
      </span>
      <p className="text-sm font-semibold text-fg">{title}</p>
      {children ? <div className="mt-1 text-sm text-muted max-w-sm">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Two-to-four option toggle (Note / URL, All / Notes / Links ...). */
export function Segmented({ options, value, onChange, label, size = 'md' }) {
  const height = size === 'sm' ? 'h-7 text-xs' : 'h-8 text-sm';
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex p-0.5 rounded-lg bg-surface-2 border border-line">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center justify-center gap-1.5 px-3 rounded-md font-medium transition-colors cursor-pointer ${FOCUS} ${height} ${
              active ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
            }`}
          >
            {option.icon ? <Icon name={option.icon} size={14} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export const inputClass = `w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-subtle transition-colors hover:border-line-strong focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20`;
