import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * Accessible tooltip: opens on hover, keyboard focus and tap; closes on Escape or outside tap.
 */
export function Tooltip({ content, children, label = 'More information' }: { content: ReactNode; children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        className="hit inline-flex items-center rounded-sm"
      >
        {children}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="glass absolute bottom-full left-1/2 z-50 mb-2 w-64 max-w-[78vw] -translate-x-1/2 animate-[pop_.4s_var(--ease-spring)] rounded-2xl px-3.5 py-2.5 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-charcoal"
        >
          {content}
        </span>
      )}
    </span>
  );
}
