import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { MODULES } from '@/features/learn/modules';
import { useStore } from '@/state/store';
import { PageHeader, Badge } from '@/components/ui';

export default function Learn() {
  const progress = useStore((s) => s.learnProgress);
  const done = MODULES.filter((m) => (progress[m.id] ?? 0) >= 2).length;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Learning centre" description={`Eleven lessons, each with a worked example and a three-question check. ${done} of ${MODULES.length} done.`} />
      <Link to="/app/learn/tax-awareness" className="bezel lift group flex flex-wrap items-center justify-between gap-6 p-5 sm:p-6">
        <span className="max-w-2xl">
          <span className="block text-[24px] font-semibold tracking-[-0.03em] text-evergreen">Tax Awareness</span>
          <span className="mt-2 block text-sm leading-relaxed text-grey">Equity gains, debt funds, EPF, PPF, NPS and ELSS: dated, editable reference values with official sources.</span>
        </span>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-evergreen text-onbrand transition-transform duration-500 ease-spring group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:scale-105" aria-hidden>
          <ArrowRight size={18} />
        </span>
      </Link>
      <ol className="grid gap-6 md:grid-cols-2">
        {MODULES.map((m, i) => {
          const score = progress[m.id];
          return (
            <li key={m.id}>
              <Link to={`/app/learn/${m.id}`} className="bezel lift group flex h-full flex-col p-5 sm:p-6">
                <span className="flex items-center justify-between gap-3">
                  <span className="num text-[32px] font-light leading-none tracking-[-0.06em] text-forest/80">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex items-center gap-3 whitespace-nowrap">
                    {score !== undefined && <Badge tone={score === 3 ? 'good' : 'neutral'}>{score}/3</Badge>}
                    <span className="num rounded-full bg-muted px-3 py-1 text-xs text-grey">{m.minutes} min</span>
                  </span>
                </span>
                <span className="mt-8 block text-[21px] font-semibold leading-snug tracking-[-0.02em] text-evergreen transition-colors group-hover:text-forest">{m.title}</span>
                <span className="mt-2 block text-sm leading-relaxed text-grey">{m.summary}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
