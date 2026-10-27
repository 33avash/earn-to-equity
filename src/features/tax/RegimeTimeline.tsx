import { useMemo } from 'react';
import type { SimResult } from '@/types/sim';
import { Tooltip } from '@/components/ui/Tooltip';
import { useMoney } from '@/state/selectors';
import { regimeSwitches, regimeTimeline } from '@/finance/regimeTimeline';

/**
 * A thin strip with one cell per year of the plan: the cheaper tax regime that year. Each cell's tooltip gives the
 * tax under both regimes and the reason. Years without salary (a break, after FI) are left out.
 */
export function RegimeTimeline({ sim }: { sim: SimResult }) {
  const money = useMoney();
  const years = useMemo(() => regimeTimeline(sim, money), [sim, money]);
  if (!years.length) return <p className="text-sm text-grey">The regime timeline needs a CTC. Switch your salary to annual CTC on Salary & offers.</p>;
  const switches = regimeSwitches(years);
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex h-9 w-full gap-[3px]" aria-label="Cheaper tax regime, year by year">
        {years.map((y) => (
          <li key={y.year} className="flex min-w-0 flex-1">
            <Tooltip
              label={`${y.year}: ${y.regime} regime`}
              content={
                <span className="flex flex-col gap-1">
                  <span className="font-semibold text-evergreen">
                    {y.year} · age {y.age}: {y.regime === 'new' ? 'New' : 'Old'} regime
                  </span>
                  <span className="num">
                    New {money(y.taxNew)} · Old {money(y.taxOld)}
                  </span>
                  <span>{y.reason}</span>
                </span>
              }
            >
              <span aria-hidden className={`block h-9 w-full rounded-md ${y.regime === 'new' ? 'bg-forest/70' : 'bg-champagne'}`} style={{ minWidth: 6 }} />
            </Tooltip>
          </li>
        ))}
      </ol>
      <div className="flex justify-between text-[11.5px] text-grey">
        <span className="num">{years[0].year}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-forest/70" aria-hidden /> New regime
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-champagne" aria-hidden /> Old regime
          </span>
        </span>
        <span className="num">{years[years.length - 1].year}</span>
      </div>
      <p className="text-[13px] text-charcoal">Your employer asks you to choose a regime each year. Here’s the cheaper one for each year of your plan.</p>
      <ul className="flex flex-col gap-1 text-[12.5px] text-grey">
        {switches.map((s) => (
          <li key={s.from}>
            <strong className="font-medium text-evergreen">
              {s.regime === 'new' ? 'New' : 'Old'} regime from {s.from}:
            </strong>{' '}
            {s.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
