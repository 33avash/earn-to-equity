import { Link } from 'react-router-dom';
import { usePlan, useMoney } from '@/state/selectors';
import { PageHeader, Stat, Section, Disclaimer, Progress } from '@/components/ui';
import { HEALTH_METHOD, type HealthKey } from '@/finance/health';
import { formatPct } from '@/finance/money';

const IMPROVE: Record<HealthKey, { text: string; to: string }> = {
  emergency: { text: 'Direct a fixed monthly amount to a liquid emergency reserve until it covers your target months.', to: '/app/emergency-debt' },
  savings: { text: 'Review lifestyle categories in the Budget Planner. Small, recurring cuts compound.', to: '/app/budget' },
  debt: { text: 'Prioritise the highest-rate loan (avalanche) and avoid new revolving card balances.', to: '/app/emergency-debt' },
  investing: { text: 'Automate a SIP on salary day and step it up with each raise.', to: '/app/sip' },
  goals: { text: 'Re-prioritise goals, extend timelines or reduce costs so the surplus covers what matters most.', to: '/app/goals' },
  protection: { text: 'Check your health cover, and consider term cover if anyone depends on your income.', to: '/app/settings' },
};

function band(score: number) {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Solid, with gaps';
  if (score >= 40) return 'Needs attention';
  return 'Fragile';
}

export default function Health() {
  const plan = usePlan();
  const money = useMoney();
  const { health, cashflow: cf, sheet, emergency: ef } = plan;
  const strengths = health.components.filter((c) => c.score >= 75);
  const gaps = health.components.filter((c) => c.score < 60).sort((a, b) => a.score * a.weight - b.score * b.weight);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Financial health" description="A 0 to 100 score from six components. The rule behind each one is in the table at the end." />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="bezel flex flex-col p-5 sm:p-6 lg:col-span-4">
          <p className="eyebrow">Your score</p>
          <p className="display mt-3 text-[64px] leading-none tracking-[-0.05em] sm:text-[72px]">
            {Math.round(health.score)}
            <span className="font-sans text-2xl text-grey">/100</span>
          </p>
          <p className="mt-2 text-lg font-semibold text-evergreen">{band(health.score)}</p>
          <Disclaimer className="mt-6">An educational measure calculated only from what you entered. It is not a credit score, a CIBIL score or an official rating of any kind.</Disclaimer>
        </div>
        <div className="bezel px-5 py-3 sm:px-6 lg:col-span-8">
          <ul>
            {health.components.map((c) => (
              <li key={c.key} className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 border-t border-line/70 py-6 first:border-t-0">
                <div>
                  <p className="text-[14px] font-semibold text-evergreen">
                    {c.label} <span className="ml-1 text-xs font-normal text-grey">weight {c.weight}%</span>
                  </p>
                  <p className="text-xs text-grey">{c.detail}</p>
                </div>
                <span className="num self-center text-lg font-semibold text-evergreen">{Math.round(c.score)}</span>
                <div className="col-span-2">
                  <Progress value={c.score / 100} label={`${c.label} score`} tone={c.score >= 75 ? 'forest' : c.score >= 50 ? 'champagne' : 'danger'} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bezel grid grid-cols-2 gap-x-6 gap-y-6 p-5 sm:p-6 lg:grid-cols-4">
        <Stat label="Net worth" value={money(sheet.netWorth)} def="netWorth" />
        <Stat label="Debt-to-income" value={formatPct(cf.debtToIncome)} def="dti" sub="EMIs ÷ monthly income" />
        <Stat label="Savings rate" value={formatPct(cf.savingsRate)} def="savingsRate" />
        <Stat label="Emergency coverage" value={`${ef.coverageMonths === Infinity ? '—' : ef.coverageMonths.toFixed(1)} months`} def="emergencyCoverage" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Strengths">
          {strengths.length ? (
            <ul className="space-y-3">
              {strengths.map((c) => (
                <li key={c.key} className="border-l-2 border-forest pl-4">
                  <p className="font-semibold text-evergreen">{c.label}</p>
                  <p className="text-sm text-grey">{c.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-grey">No component scores 75 or above yet. That’s common early on. The improvements alongside are the place to start.</p>
          )}
        </Section>
        <Section title="Where to improve">
          {gaps.length ? (
            <ol className="space-y-4">
              {gaps.map((c) => (
                <li key={c.key} className="border-l-2 border-champagne pl-4">
                  <p className="font-semibold text-evergreen">{c.label}</p>
                  <p className="text-sm text-grey">{IMPROVE[c.key].text}</p>
                  <Link to={IMPROVE[c.key].to} className="hit mt-1 inline-block text-sm font-medium text-forest hover:underline">
                    Open the relevant tool
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-grey">Every component scores 60 or above. Keep testing your plan against setbacks in the Risk Lab.</p>
          )}
        </Section>
      </div>

      <Section title="Methodology" description="Each component is scored 0–100, then combined using the weights below.">
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="table-fin w-full min-w-[560px]">
            <thead>
              <tr>
                <th scope="col">Component</th>
                <th scope="col">Weight</th>
                <th scope="col">How it is scored</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(HEALTH_METHOD) as HealthKey[]).map((k) => (
                <tr key={k}>
                  <td className="font-medium text-evergreen">{HEALTH_METHOD[k].label}</td>
                  <td>{HEALTH_METHOD[k].weight}%</td>
                  <td className="font-sans text-[13px] text-grey">{HEALTH_METHOD[k].rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
