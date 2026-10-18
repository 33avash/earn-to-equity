import { Link } from 'react-router-dom';

export function Mark({ size = 22, inverse = false }: { size?: number; inverse?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="4" className={inverse ? 'fill-ivory/10 dark:fill-evergreen' : 'fill-evergreen'} />
      <path d="M7 23 L13 16 L18 19 L25 9" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="stroke-champagne" />
    </svg>
  );
}

export function Wordmark({ to = '/', compact = false, inverse = false }: { to?: string; compact?: boolean; inverse?: boolean }) {
  return (
    <Link to={to} className="hit flex items-center gap-2.5 rounded-sm" aria-label="Earn to Equity home">
      <Mark inverse={inverse} />
      {!compact && <span className={`font-display text-[21px] leading-none tracking-[-0.01em] ${inverse ? 'text-ivory dark:text-evergreen' : 'text-evergreen'}`}>Earn to Equity</span>}
    </Link>
  );
}
