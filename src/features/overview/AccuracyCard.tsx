import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import type { Plan } from '@/state/selectors';
import { planAccuracy } from '@/finance/accuracy';
import { Progress } from '@/components/ui/Misc';

/**
 * Plan accuracy: the share of what moves this projection that comes from your own numbers. Each missing detail
 * links to its field and says how far a typical value would move your FI age.
 */
export function AccuracyCard({ plan }: { plan: Plan }) {
  const acc = useMemo(() => planAccuracy(plan.profile, plan.assumptions), [plan.profile, plan.assumptions]);
  const missing = acc.items.filter((i) => !i.filled).sort((a, b) => b.weight - a.weight);
  const pct = Math.round(acc.score * 100);
  return (
    <section aria-labelledby="acc-h" className="bezel flex flex-col gap-4 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="acc-h" className="card-title">Plan accuracy</h2>
        <span className="num text-[22px] font-semibold tracking-[-0.03em] text-evergreen">{pct}%</span>
      </div>
      <Progress value={acc.score} label="Plan accuracy" tone={pct >= 80 ? 'forest' : 'champagne'} />
      <p className="text-[12.5px] leading-relaxed text-grey">The share of what moves your projection that comes from your own numbers rather than defaults, weighted by how much each detail can move it.</p>
      {missing.length > 0 ? (
        <div>
          <p className="mb-2 text-[13px] font-medium text-evergreen">Improve accuracy</p>
          <ul className="flex flex-col divide-y divide-line/70">
            {missing.map((i) => (
              <li key={i.key}>
                <Link to={i.link} className="group flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-[13.5px] text-charcoal group-hover:text-evergreen">{i.label}</span>
                    <span className="block text-[12px] text-grey">
                      {i.fiYears >= 1 ? `≈ moves your FI age by up to ${Math.round(i.fiYears)} year${Math.round(i.fiYears) === 1 ? '' : 's'}` : i.healthPoints >= 1 ? `≈ moves plan health by up to ${Math.round(i.healthPoints)} points` : 'Small effect on this plan'}
                    </span>
                  </span>
                  <ArrowRight size={14} className="shrink-0 text-grey group-hover:text-forest" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-[13px] text-forest">
          <Check size={14} aria-hidden /> Every high-impact detail is filled in.
        </p>
      )}
    </section>
  );
}
