import { Link } from 'react-router-dom';

export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="7" className="fill-evergreen" />
      <path d="M7 22 L13 15.5 L18 18.5 L25 9.5"  strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'rgb(var(--chart-1))' }} />
    </svg>
  );
}

export function Wordmark({ to = '/', compact = false }: { to?: string; inverse?: boolean; compact?: boolean }) {
  return (
    <Link to={to} className="hit flex items-center gap-2 rounded-sm" aria-label="Earn to Equity home">
      <Mark />
      {!compact && <span className="text-[15px] font-semibold tracking-[-0.02em] text-evergreen">Earn to Equity</span>}
    </Link>
  );
}
