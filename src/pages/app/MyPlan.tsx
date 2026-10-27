import { useState } from 'react';
import { ChevronDown, Wand2 } from 'lucide-react';
import { usePlan, useMoney } from '@/state/selectors';
import { useStore } from '@/state/store';
import { PageHeader, Section, Segmented, Disclaimer, Button, Toggle } from '@/components/ui';
import { WealthChart, WealthLegend, type WealthMode } from '@/components/charts/WealthChart';
import { YearInspector, ScenarioSection } from '@/features/simulator/Sections';
import { ProjectionTable } from '@/features/simulator/ProjectionTable';
import { RegimeTimeline } from '@/features/tax/RegimeTimeline';
import { useRanges } from '@/features/overview/useRanges';
import { bandByYear, RANGE_NOTE } from '@/finance/ranges';

/**
 * My plan: the projection, a year inspector and Fix my plan, with the scenario table and tornado behind
 * "Show details". The full Wealth simulator (assumptions, baseline, CSV) is under Advanced tools.
 */
export default function MyPlan() {
  const plan = usePlan();
  const money = useMoney();
  const setFixOpen = useStore((s) => s.setFixOpen);
  const [mode, setMode] = useState<WealthMode>('real');
  const [selected, setSelected] = useState<number | null>(plan.profile.planStartYear + 4);
  const [details, setDetails] = useState(false);
  const [showBand, setShowBand] = useState(true);
  const { data: ranges } = useRanges(plan);
  const band = ranges && showBand ? bandByYear(ranges, mode === 'real', plan.profile.planStartYear, plan.assumptions.inflation) : undefined;
  const close = plan.sim.points.at(-1)!;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My plan"
        description={`Your projection to ${close.year}, year by year. Click a year on the chart to see inside it.`}
        actions={
          <Button size="sm" onClick={() => setFixOpen(true)}>
            <Wand2 size={14} aria-hidden /> Fix my plan
          </Button>
        }
      />

      <Section
        title="Projected net worth"
        description={`The line is the base case: every year earns the assumed return. The shaded band is the 10th–90th percentile. ${RANGE_NOTE}`}
        actions={<Segmented label="Values shown" size="sm" value={mode} onChange={setMode} options={[{ value: 'real', label: 'Today’s ₹' }, { value: 'nominal', label: 'Future ₹' }, { value: 'both', label: 'Both' }]} />}
      >
        <WealthChart points={plan.sim.points} mode={mode} height={340} selectedYear={selected} onSelectYear={setSelected} showFiTarget band={band} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <WealthLegend mode={mode} fi band={!!band} />
          <Toggle checked={showBand} onChange={setShowBand} label="Show range" />
        </div>
      </Section>

      <Section title="Tax regime, year by year" description="The cheaper regime for each year your plan has a salary.">
        <RegimeTimeline sim={plan.sim} />
      </Section>

      <YearInspector plan={plan} selected={selected} setSelected={setSelected} />

      <div>
        <Button variant="secondary" size="sm" aria-expanded={details} onClick={() => setDetails((d) => !d)}>
          <ChevronDown size={14} aria-hidden className={`transition-transform ${details ? 'rotate-180' : ''}`} /> {details ? 'Hide details' : 'Show details'}
        </Button>
      </div>
      {details && (
        <>
          <Section title="Year-by-year projection" description={`Flows for each calendar year and balances on 31 December, in future rupees. The last line is 1 January ${close.year}.`}>
            <ProjectionTable rows={plan.sim.rows} close={close} money={money} selected={selected} onSelect={setSelected} />
          </Section>
          <ScenarioSection plan={plan} />
        </>
      )}

      <Disclaimer>Projections are estimates from assumptions you can change, not guarantees or investment advice.</Disclaimer>
    </div>
  );
}
