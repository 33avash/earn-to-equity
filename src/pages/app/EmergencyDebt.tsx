import { useMemo, useState } from 'react';
import { usePlan, useMoney } from '@/state/selectors';
import { useStore } from '@/state/store';
import { PageHeader, Section, Slider, Field, MoneyInput, Toggle, Stat, Progress, Notice, Disclaimer, Badge } from '@/components/ui';
import { emergencyPlan } from '@/finance/emergency';
import { compareStrategies, strategyNote } from '@/finance/debt';
import { formatMonths } from '@/finance/money';
import { LoansEditor } from '@/features/editors/Loans';
import { MultiLineChart } from '@/components/charts/SeriesCharts';
import { useChartTheme } from '@/components/charts/theme';

export default function EmergencyDebt() {
  const plan = usePlan();
  const money = useMoney();
  const t = useChartTheme();
  const update = useStore((s) => s.updateProfile);
  const p = plan.profile;
  const [contribution, setContribution] = useState(p.cashflow.monthlySavings);
  const [includeCash, setIncludeCash] = useState(true);
  const ef = emergencyPlan(p, { monthlyContribution: contribution, includeCashSavings: includeCash });

  const [extra, setExtra] = useState(Math.max(0, Math.round(plan.cashflow.unallocated)));
  const result = useMemo(() => compareStrategies(p.liabilities, extra), [p.liabilities, extra]);
  const { avalanche: av, snowball: sb } = result;
  const chartData = useMemo(() => {
    const len = Math.max(av.balances.length, sb.balances.length);
    const step = len > 120 ? 3 : 1;
    const out: Record<string, number>[] = [];
    for (let m = 0; m < len; m += step) out.push({ month: m, avalanche: av.balances[Math.min(m, av.balances.length - 1)]?.total ?? 0, snowball: sb.balances[Math.min(m, sb.balances.length - 1)]?.total ?? 0 });
    return out;
  }, [av, sb]);
  const hasDebt = p.liabilities.some((l) => l.balance > 0);
  const error = av.error || sb.error;
  const saving = sb.totalInterest - av.totalInterest;
  const note = strategyNote(p.liabilities, result);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Emergency fund & debt" description="Size a reserve of 3 to 12 months of essentials and EMIs, then compare two ways to clear your loans." />

      <Section title="Emergency fund" description="Covers essential expenses and loan repayments, the bills that continue if income stops.">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-5">
            <Slider label="Target" value={p.protection.emergencyTargetMonths} min={3} max={12} step={1} format={(v) => `${v} months`} onChange={(v) => update((x) => void (x.protection.emergencyTargetMonths = v))} help="3 months is a minimum for stable salaried income. 6–12 months suits variable income, dependents or a single-income household." />
            <Field label="Monthly contribution towards the reserve" hint="Defaults to your monthly savings transfer.">
              {(id, d) => <MoneyInput id={id} describedBy={d} value={contribution} onChange={setContribution} max={1e7} />}
            </Field>
            <Toggle checked={includeCash} onChange={setIncludeCash} label="Count bank savings as liquid" description="Turn off if your bank balance is earmarked for something else." />
          </div>
          <div className="lg:col-span-7">
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
              <Stat label="Recommended reserve" value={money(ef.recommendedReserve)} sub={`${money(ef.monthlyNeed)}/mo × ${ef.targetMonths}`} />
              <Stat label="Eligible liquid savings" value={money(ef.eligibleLiquid)} />
              <Stat label="Funding gap" value={ef.gap > 0 ? money(ef.gap) : 'None'} tone={ef.gap > 0 ? 'negative' : undefined} />
              <Stat label="Current coverage" value={`${ef.coverageMonths === Infinity ? '—' : ef.coverageMonths.toFixed(1)} months`} def="emergencyCoverage" />
              <Stat label="Monthly contribution" value={money(ef.monthlyContribution)} />
              <Stat label="Time to target" value={ef.gap === 0 ? 'Reached' : formatMonths(ef.monthsToTarget)} />
            </div>
            <div className="mt-8">
              <div className="mb-2 flex justify-between text-xs text-grey">
                <span>Progress</span>
                <span className="num">{Math.min(100, Math.round((ef.eligibleLiquid / Math.max(1, ef.recommendedReserve)) * 100))}%</span>
              </div>
              <Progress value={ef.eligibleLiquid / Math.max(1, ef.recommendedReserve)} label="Emergency fund progress" tone={ef.gap > 0 ? 'champagne' : 'forest'} />
            </div>
            {ef.gap > 0 && ef.monthsToTarget === null && <Notice tone="warning">With no monthly contribution, the reserve won’t reach its target. Even a small automatic transfer helps.</Notice>}
          </div>
        </div>
      </Section>

      <Section title="Debt planner" description="Compare paying the highest interest rate first (avalanche) with paying the smallest balance first (snowball).">
        <LoansEditor loans={p.liabilities} onChange={(l) => update((x) => void (x.liabilities = l))} />
        {hasDebt && (
          <div className="mt-10 grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Field label="Extra monthly repayment" hint="On top of all minimum payments. Defaults to your unallocated surplus.">
                {(id, d) => <MoneyInput id={id} describedBy={d} value={extra} onChange={setExtra} max={1e7} />}
              </Field>
              {!error && saving > 1 && (
                <p className="mt-6 text-sm leading-relaxed text-charcoal">
                  Avalanche saves <strong className="num text-forest">{money(saving)}</strong> in interest compared with snowball
                  {sb.months !== av.months ? <> and finishes {Math.abs(sb.months - av.months)} month{Math.abs(sb.months - av.months) === 1 ? '' : 's'} {av.months < sb.months ? 'sooner' : 'later'}</> : null}. Snowball clears individual loans sooner, which some people find motivating.
                </p>
              )}
              {!error && saving <= 1 && <p className="mt-6 text-sm text-charcoal">{note ?? 'Both strategies cost about the same for your loans.'}</p>}
            </div>
            <div className="lg:col-span-8">
              {error ? (
                <Notice tone="error" title="These repayments don’t reduce the debt">
                  {error}
                </Notice>
              ) : (
                <>
                  <div className="-mx-1 overflow-x-auto px-1">
                    <table className="table-fin w-full min-w-[480px]">
                      <thead>
                        <tr>
                          <th scope="col">Strategy</th>
                          <th scope="col">Debt-free in</th>
                          <th scope="col">Interest paid</th>
                          <th scope="col">Payoff order</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[av, sb].map((r) => (
                          <tr key={r.strategy}>
                            <td className="font-sans font-medium capitalize text-evergreen">
                              {r.strategy} {r === av && saving > 1 && <Badge tone="good">Lower cost</Badge>}
                            </td>
                            <td>{formatMonths(r.months)}</td>
                            <td>{money(r.totalInterest)}</td>
                            <td className="font-sans text-[13px] text-grey">{r.order.map((o) => o.label).join(' → ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-8">
                    <MultiLineChart
                      data={chartData}
                      xKey="month"
                      height={240}
                      xFormat={(m) => (m < 12 ? `M${m}` : `Y${(m / 12).toFixed(m % 12 ? 1 : 0)}`)}
                      ariaLabel="Total debt outstanding over time under each strategy"
                      series={[
                        { key: 'avalanche', name: 'Avalanche', color: t.primary },
                        { key: 'snowball', name: 'Snowball', color: t.secondary, dashed: true },
                      ]}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        <Disclaimer className="mt-8">Interest accrues monthly at the stated APR ÷ 12. Prepayment charges, fees and rate changes are not modelled. Home-loan prepayments may have different tax implications.</Disclaimer>
      </Section>
    </div>
  );
}
