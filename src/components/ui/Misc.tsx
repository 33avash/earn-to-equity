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

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="flex flex-col gap-5 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="display text-[34px] leading-[1.05] tracking-[-0.015em] sm:text-[44px]">{title}</h1>
        {description && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-grey">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Section({ title, description, actions, children, className = '' }: { title?: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            {title && <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>}
            {description && <p className="mt-1 text-sm text-grey">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Disclaimer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`border-l-2 border-champagne pl-3 text-xs leading-relaxed text-grey ${className}`}>{children}</p>;
}

export function Notice({ tone = 'info', title, children, action }: { tone?: 'info' | 'warning' | 'error'; title?: string; children: ReactNode; action?: ReactNode }) {
  const tones = {
    info: 'border-sage bg-mint/50',
    warning: 'border-champagne bg-champagne/10',
    error: 'border-danger/60 bg-danger/5',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex flex-col gap-3 rounded border-l-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${tones[tone]}`}>
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
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line bg-surface px-6 py-10 text-center sm:px-8">
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
      <div className={`h-full ${color} transition-[width] duration-300`} style={{ width: `${pct}%` }} />
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

export const toast = (text: string) => sonnerToast(text);

export function Toaster() {
  const { resolved } = useTheme();
  return <SonnerToaster theme={resolved} position="bottom-center" offset={88} toastOptions={{ className: 'font-sans text-sm', duration: 3500 }} />;
}
