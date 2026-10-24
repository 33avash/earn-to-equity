import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import * as Popover from '@radix-ui/react-popover';
import { ArrowRight } from 'lucide-react';
import type { HealthKey, HealthResult } from '@/finance/health';

/** Score band, shared by the ring colour and its label. */
export function scoreBand(score: number): { label: string; color: string; token: string } {
  const band = (label: string, token: string) => ({ label, token, color: `rgb(var(${token}))` });
  if (score >= 80) return band('Strong', '--success');
  if (score >= 60) return band('Solid, with gaps', '--accent');
  if (score >= 40) return band('Needs attention', '--warning');
  return band('Fragile', '--danger');
}

/** Where to go to improve each component of the score. */
const FIX: Record<HealthKey, { to: string; label: string }> = {
  emergency: { to: '/app/emergency-debt', label: 'Plan your emergency fund' },
  savings: { to: '/app/budget', label: 'Review your budget' },
  debt: { to: '/app/emergency-debt', label: 'Compare repayment plans' },
  investing: { to: '/app/sip', label: 'Set up a SIP' },
  goals: { to: '/app/goals', label: 'Fund your goals' },
  protection: { to: '/app/health', label: 'Check your cover' },
};

/** Animated 0–100 ring. The arc draws in from zero; the number sits in the centre. */
export function ScoreRing({ score, size = 44, stroke = 4, showValue = true }: { score: number; size?: number; stroke?: number; showValue?: boolean }) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const { color, token } = scoreBand(score);
  const v = Math.max(0, Math.min(100, score)) / 100;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--border))" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: v }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          style={{ filter: `drop-shadow(0 0 ${size / 10}px rgb(var(${token}) / 0.45))` }}
        />
      </svg>
      {showValue && (
        <span className="num absolute font-semibold tracking-[-0.04em] text-evergreen" style={{ fontSize: size * 0.3 }}>
          {Math.round(score)}
        </span>
      )}
    </span>
  );
}

/** Compact ring for the app header. Opens a breakdown of the six components, weakest first. */
export function ScoreButton({ health }: { health: HealthResult }) {
  const band = scoreBand(health.score);
  const parts = [...health.components].sort((a, b) => a.score - b.score);
  const weakest = parts[0];
  return (
    <Popover.Root>
      <Popover.Trigger className="tap inline-flex h-9 items-center gap-2 rounded-full pl-0.5 pr-3 text-[13px] text-grey transition-colors hover:bg-muted hover:text-evergreen" aria-label={`Plan score ${Math.round(health.score)} of 100: ${band.label}. Show breakdown`}>
        <ScoreRing score={health.score} size={32} stroke={3} />
        <span className="hidden xl:inline">Plan score</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={10} className="frame-glass z-50 w-[min(92vw,340px)] p-5 outline-none data-[state=open]:animate-[pop_0.35s_var(--ease-spring)]">
          <div className="flex items-center gap-4">
            <ScoreRing score={health.score} size={64} stroke={5} />
            <div>
              <p className="text-[15px] font-semibold text-evergreen">Plan score: {band.label}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-grey">Six weighted checks on your plan. Educational, not a credit score.</p>
            </div>
          </div>
          <ul className="mt-5 flex flex-col gap-3">
            {parts.map((c) => (
              <li key={c.key}>
                <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                  <span className="text-charcoal">{c.label}</span>
                  <span className="num text-grey">{Math.round(c.score)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(2, c.score)}%`, background: scoreBand(c.score).color }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
            <Popover.Close asChild>
              <Link to={FIX[weakest.key].to} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-forest">
                {FIX[weakest.key].label} <ArrowRight size={14} aria-hidden />
              </Link>
            </Popover.Close>
            <Popover.Close asChild>
              <Link to="/app/health" className="text-[12.5px] text-grey hover:text-evergreen">
                Method
              </Link>
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
