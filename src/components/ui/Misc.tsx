import { useEffect, useRef, type ReactNode } from 'react';
import { Info, AlertTriangle, X } from 'lucide-react';
import { create } from 'zustand';
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
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-[32px] leading-none', xl: 'text-[44px] sm:text-[56px] leading-none' };
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
        className={`num mt-1.5 font-semibold tracking-tight ${sizes[size]} ${tone === 'negative' ? 'text-danger' : 'text-evergreen'} ${size === 'xl' ? 'font-display font-normal' : ''}`}
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

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="relative flex flex-col items-start gap-3 overflow-hidden rounded-md border border-line bg-[linear-gradient(135deg,rgb(var(--c-mint)/0.55),transparent_60%)] px-6 py-10 sm:px-8">
      <span aria-hidden className="h-px w-10 bg-champagne" />
      <p className="display text-[22px]">{title}</p>
      {children && <p className="max-w-md text-sm text-grey">{children}</p>}
      {action}
    </div>
  );
}

export type BadgeTone = 'good' | 'warn' | 'bad' | 'neutral';
export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  // Status reads as a quiet inline label (dot + text), not a pill.
  const tones: Record<BadgeTone, { text: string; dot: string }> = {
    good: { text: 'text-forest', dot: 'bg-forest' },
    warn: { text: 'text-[#7a5b22] dark:text-champagne', dot: 'bg-champagne' },
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
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(92vw,440px)] rounded-md border border-line bg-surface p-0 text-charcoal backdrop:bg-evergreen/40"
      aria-labelledby="confirm-title"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="confirm-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button type="button" onClick={onCancel} aria-label="Close" className="text-grey hover:text-evergreen">
            <X size={18} />
          </button>
        </div>
        <div className="mt-2 text-sm text-grey">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

/* ---------- Toasts ---------- */

interface ToastItem {
  id: number;
  text: string;
}
export const useToasts = create<{ items: ToastItem[]; push: (text: string) => void; dismiss: (id: number) => void }>((set) => ({
  items: [],
  push: (text) => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items, { id, text }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), 3500);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));
export const toast = (text: string) => useToasts.getState().push(text);

export function Toaster() {
  const items = useToasts((s) => s.items);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-20 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2 lg:bottom-6">
      {items.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-3 rounded bg-evergreen px-4 py-2.5 text-sm text-onbrand shadow-lg">
          {t.text}
          <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
