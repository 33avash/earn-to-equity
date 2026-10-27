import { type ReactNode } from 'react';
import { Info, AlertTriangle } from 'lucide-react';
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';
import { useTheme } from '@/theme/ThemeProvider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from './shadcn/dialog';
import { Tooltip } from './Tooltip';
import { Button } from './Button';
import { DEFINITIONS, type DefinitionKey } from './definitions';

/** Metric with label, value and an optional definition tooltip. Typography carries the hierarchy. */
export function Stat({
  label,
  value,
  sub,
  def,
  size = 'md',
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  def?: DefinitionKey | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'positive' | 'negative';
}) {
  const definition = def ? (DEFINITIONS as Record<string, string>)[def] ?? def : undefined;
  // Large figures use Geist Sans with tabular digits; mono reads awkwardly at display sizes.
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'font-sans [&_.num]:font-sans text-[32px] leading-none', xl: 'font-sans [&_.num]:font-sans text-[44px] sm:text-[52px] leading-none tracking-[-0.035em]' };
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="eyebrow">{label}</span>
        {definition && (
          <Tooltip content={definition} label={`What is ${label}?`}>
            <Info size={12} className="text-grey" aria-hidden />
          </Tooltip>
        )}
      </div>
      <div
        className={`num mt-1.5 font-semibold tracking-tight ${sizes[size]} ${tone === 'negative' ? 'text-danger' : 'text-evergreen'} `}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-grey">{sub}</div>}
    </div>
  );
}

/** Splits a heading so its last word can be set as an editorial serif accent. */
export function AccentTitle({ text }: { text: string }) {
  const i = text.lastIndexOf(' ');
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i + 1)}
      <span className="serif-accent">{text.slice(i + 1)}</span>
    </>
  );
}

/** Double-bezel card: a core sitting in a hairline tray. Use for any major card. */
export function Bezel({ as: As = 'div', className = '', children, ...rest }: { as?: 'div' | 'section' | 'article' | 'aside' | 'li'; className?: string; children: ReactNode; [k: string]: unknown }) {
  return (
    <As className={`bezel ${className}`} {...rest}>
      {children}
    </As>
  );
}

type FrameTag = 'div' | 'section' | 'article' | 'aside' | 'li';

/** Layered frame: a top-lit gradient surface with a hairline edge. `size` steps the radius up on wide screens. */
export function Frame({ as: As = 'div', size = 'md', className = '', children, ...rest }: { as?: FrameTag; size?: 'md' | 'lg' | 'xl'; className?: string; children: ReactNode; [k: string]: unknown }) {
  const radius = size === 'xl' ? 'frame-xl' : size === 'lg' ? 'frame-lg' : '';
  return (
    <As className={`frame ${radius} ${className}`} {...rest}>
      {children}
    </As>
  );
}

/** Frosted frame for a layer floating over others (chips, overlays). */
export function GlassFrame({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`frame-glass ${className}`}>{children}</div>;
}

/** A window bezel holding a live product panel: a title bar with the mark and a label, then the screen. */
export function DeviceFrame({ label, className = '', screenClassName = '', children, chrome }: { label: string; className?: string; screenClassName?: string; children: ReactNode; chrome?: ReactNode }) {
  return (
    <div className={`device ${className}`}>
      <div className={`device-screen ${screenClassName}`}>
        <div className="flex items-center gap-3 border-b border-line/70 px-4 py-3">
          <span className="truncate rounded-full bg-muted/70 px-3 py-1 text-[11.5px] text-grey">{label}</span>
          {chrome && <span className="ml-auto">{chrome}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Section heading for public pages: large title on the left, the supporting line on the right. */
export function SectionHead({ id, title, children, center = false }: { id: string; title: ReactNode; children?: ReactNode; center?: boolean }) {
  if (center)
    return (
      <div className="mx-auto mb-14 max-w-3xl text-center lg:mb-20">
        <h2 id={id} className="display text-[38px] leading-[1] sm:text-[52px] lg:text-[64px]">
          {title}
        </h2>
        {children && <div className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-grey">{children}</div>}
      </div>
    );
  return (
    <div className="mb-14 grid gap-6 lg:mb-20 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-7">
        <h2 id={id} className="display text-[38px] leading-[1] sm:text-[52px] lg:text-[64px]">
          {title}
        </h2>
      </div>
      {children && <div className="text-[16px] leading-relaxed text-grey lg:col-span-4 lg:col-start-9">{children}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="mb-1.5 text-[12px] font-medium text-grey">{eyebrow}</p>}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-evergreen sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-grey">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** A dashboard card: a header row (title, description, actions) over a padded body. Pass bare for a flat block. */
export function Section({ title, description, actions, children, className = '', bare = false }: { title?: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bare?: boolean }) {
  const head = title || actions;
  if (bare) {
    return (
      <section className={className}>
        {head && (
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-2xl">
              {title && <h2 className="text-[16px] font-semibold tracking-[-0.015em]">{title}</h2>}
              {description && <p className="mt-1 text-[13px] leading-relaxed text-grey">{description}</p>}
            </div>
            {actions}
          </div>
        )}
        {children}
      </section>
    );
  }
  return (
    <section className={`bezel ${className}`}>
      {head && (
        <div className="card-head">
          <div className="max-w-2xl">
            {title && <h2 className="card-title">{title}</h2>}
            {description && <p className="mt-0.5 text-[12.5px] leading-relaxed text-grey">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Disclaimer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`max-w-3xl border-l border-champagne/60 pl-4 text-xs leading-relaxed text-grey ${className}`}>{children}</p>;
}

export function Notice({ tone = 'info', title, children, action }: { tone?: 'info' | 'warning' | 'error'; title?: string; children: ReactNode; action?: ReactNode }) {
  const tones = {
    info: 'bg-mint/50 ring-forest/15',
    warning: 'bg-champagne/10 ring-champagne/25',
    error: 'bg-danger/5 ring-danger/25',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex flex-col gap-4 rounded-2xl px-5 py-4 ring-1 ring-inset sm:flex-row sm:items-center sm:justify-between ${tones[tone]}`}>
      <div className="flex gap-2.5">
        {tone !== 'info' && <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${tone === 'error' ? 'text-danger' : 'text-champagne'}`} aria-hidden />}
        <div className="text-sm">
          {title && <p className="font-semibold text-evergreen">{title}</p>}
          <div className="text-charcoal/90">{children}</div>
        </div>
      </div>
      {action}
    </div>
  );
}

export type EmptyArt = 'goals' | 'portfolio' | 'events' | 'loans' | 'chat' | 'chart';

/** Small line illustrations for empty states, drawn in theme colours. */
function EmptyIllustration({ art }: { art: EmptyArt }) {
  const stroke = 'rgb(var(--border-strong))';
  const accent = 'rgb(var(--accent))';
  const common = { fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const shapes: Record<EmptyArt, JSX.Element> = {
    goals: (
      <>
        <circle cx="40" cy="36" r="22" stroke={stroke} {...common} />
        <circle cx="40" cy="36" r="13" stroke={stroke} {...common} />
        <circle cx="40" cy="36" r="4" fill={accent} />
        <path d="M58 18 L44 32" stroke={accent} {...common} />
      </>
    ),
    portfolio: (
      <>
        <circle cx="40" cy="36" r="22" stroke={stroke} {...common} />
        <path d="M40 14 A22 22 0 0 1 62 36 L40 36 Z" fill={accent} opacity="0.85" />
      </>
    ),
    events: (
      <>
        <rect x="16" y="18" width="48" height="40" rx="6" stroke={stroke} {...common} />
        <path d="M16 30 H64 M28 12 V22 M52 12 V22" stroke={stroke} {...common} />
        <rect x="44" y="38" width="10" height="10" rx="2" fill={accent} />
      </>
    ),
    loans: (
      <>
        <rect x="14" y="22" width="52" height="32" rx="6" stroke={stroke} {...common} />
        <path d="M14 32 H66" stroke={stroke} {...common} />
        <path d="M22 46 H36" stroke={accent} {...common} />
      </>
    ),
    chat: (
      <>
        <path d="M16 20 H64 V48 H36 L26 58 V48 H16 Z" stroke={stroke} {...common} />
        <path d="M26 30 H54 M26 38 H44" stroke={accent} {...common} />
      </>
    ),
    chart: (
      <>
        <path d="M14 58 H66 M14 58 V16" stroke={stroke} {...common} />
        <path d="M20 50 L32 40 L42 44 L60 24" stroke={accent} {...common} />
      </>
    ),
  };
  return (
    <svg width="80" height="72" viewBox="0 0 80 72" aria-hidden className="shrink-0">
      {shapes[art]}
    </svg>
  );
}

export function EmptyState({ title, children, action, art = 'chart' }: { title: string; children?: ReactNode; action?: ReactNode; art?: EmptyArt }) {
  return (
    <div className="well flex flex-col items-center gap-3 px-6 py-14 text-center sm:px-10">
      <EmptyIllustration art={art} />
      <p className="text-[16px] font-semibold tracking-tight text-evergreen">{title}</p>
      {children && <p className="max-w-md text-sm text-grey">{children}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export type BadgeTone = 'good' | 'warn' | 'bad' | 'neutral';
export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  // Status reads as a quiet inline label (dot + text), not a pill.
  const tones: Record<BadgeTone, { text: string; dot: string }> = {
    good: { text: 'text-forest', dot: 'bg-forest' },
    warn: { text: 'text-champagne', dot: 'bg-champagne' },
    bad: { text: 'text-danger', dot: 'bg-danger' },
    neutral: { text: 'text-grey', dot: 'bg-sage' },
  };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.08em] ${tones[tone].text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tones[tone].dot}`} aria-hidden />
      {children}
    </span>
  );
}

export function Progress({ value, label, tone = 'forest' }: { value: number; label: string; tone?: 'forest' | 'champagne' | 'danger' }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const color = { forest: 'bg-forest', champagne: 'bg-champagne', danger: 'bg-danger' }[tone];
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div className={`h-full w-full origin-left rounded-full ${color} transition-transform duration-700 ease-spring`} style={{ transform: `scaleX(${pct / 100})` }} />
    </div>
  );
}

/* ---------- Confirmation dialog ---------- */

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{children}</DialogDescription>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Toasts (sonner) ---------- */

export const toast = (text: string, opts?: { action?: { label: string; onClick: () => void }; duration?: number }) => sonnerToast(text, opts);

export function Toaster() {
  const { resolved } = useTheme();
  return <SonnerToaster theme={resolved} position="bottom-right" offset={24} toastOptions={{ className: 'font-sans text-sm', duration: 3500 }} />;
}
