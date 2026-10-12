import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { MODULES } from '@/features/learn/modules';
import { useStore } from '@/state/store';
import { PageHeader, Badge } from '@/components/ui';

export default function Learn() {
  const progress = useStore((s) => s.learnProgress);
  const done = MODULES.filter((m) => (progress[m.id] ?? 0) >= 2).length;
  return (
    <div className="flex flex-col gap-10">
      <PageHeader title="Learning Centre" description={`Concise modules with a worked example, key takeaways and a three-question check. ${done} of ${MODULES.length} completed.`} />
      <Link to="/app/learn/tax-awareness" className="group flex flex-wrap items-center justify-between gap-4 rounded border-l-2 border-champagne bg-champagne/10 px-5 py-4">
        <span>
          <span className="block font-semibold text-evergreen">Tax Awareness</span>
          <span className="text-sm text-grey">Equity gains, debt funds, EPF, PPF, NPS and ELSS: dated, editable reference values with official sources.</span>
        </span>
        <ArrowRight size={16} className="text-forest transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
      <ol>
        {MODULES.map((m, i) => {
          const score = progress[m.id];
          return (
            <li key={m.id} className="border-t border-line last:border-b">
              <Link to={`/app/learn/${m.id}`} className="group grid grid-cols-[36px_1fr_auto] items-baseline gap-4 py-5">
                <span className="num text-xs text-grey">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span className="display block text-[21px] leading-snug transition-colors group-hover:text-forest">{m.title}</span>
                  <span className="mt-1 block text-sm text-grey">{m.summary}</span>
                </span>
                <span className="flex flex-col items-end gap-1 whitespace-nowrap">
                  <span className="num text-xs text-grey">{m.minutes} min</span>
                  {score !== undefined && <Badge tone={score === 3 ? 'good' : 'neutral'}>{score}/3</Badge>}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
