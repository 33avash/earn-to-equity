import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SipPreview } from '@/features/sip/SipPreview';
import { MoneyInput, PercentInput, Field, NumberInput, Stat, Disclaimer, Button } from '@/components/ui';
import { emi, inflate, toReal } from '@/finance/rates';
import { formatINR, formatPct } from '@/finance/money';
import { useExploreDemo } from '@/state/useDemo';

function EmiTool() {
  const [p, setP] = useState(2000000);
  const [r, setR] = useState(0.09);
  const [y, setY] = useState(10);
  const e = emi(p, r, y * 12);
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="grid gap-5">
        <Field label="Loan amount">{(id) => <MoneyInput id={id} value={p} onChange={setP} max={1e9} />}</Field>
        <Field label="Interest rate (APR)">{(id) => <PercentInput id={id} value={r} onChange={setR} max={60} />}</Field>
        <Field label="Tenure (years)">{(id) => <NumberInput id={id} value={y} onChange={setY} min={1} max={40} />}</Field>
      </div>
      <div className="grid grid-cols-2 content-start gap-6">
        <Stat label="Monthly EMI" value={formatINR(e)} />
        <Stat label="Total interest" value={formatINR(e * y * 12 - p)} />
        <Stat label="Total repaid" value={formatINR(e * y * 12)} size="sm" />
        <Stat label="Interest share" value={formatPct((e * y * 12 - p) / (e * y * 12))} size="sm" />
      </div>
    </div>
  );
}

function InflationTool() {
  const [amt, setAmt] = useState(1000000);
  const [infl, setInfl] = useState(0.06);
  const [y, setY] = useState(15);
  const r = useMemo(() => ({ future: inflate(amt, infl, y), real: toReal(amt, infl, y) }), [amt, infl, y]);
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="grid gap-5">
        <Field label="Amount in today’s rupees">{(id) => <MoneyInput id={id} value={amt} onChange={setAmt} max={1e10} />}</Field>
        <Field label="Inflation">{(id) => <PercentInput id={id} value={infl} onChange={setInfl} max={20} />}</Field>
        <Field label="Years">{(id) => <NumberInput id={id} value={y} onChange={setY} min={1} max={50} />}</Field>
      </div>
      <div className="grid content-start gap-6">
        <Stat label={`Will cost in ${y} years`} value={formatINR(r.future)} />
        <Stat label={`${formatINR(amt)} received in ${y} years is worth today`} value={formatINR(r.real)} />
      </div>
    </div>
  );
}

export default function Tools() {
  const explore = useExploreDemo();
  const navigate = useNavigate();
  return (
    <div className="container-x py-16 lg:py-24">
      <p className="eyebrow">Financial tools</p>
      <h1 className="display mt-3 max-w-3xl text-[44px] leading-[1.06] sm:text-[56px]">Quick answers, before you build a plan.</h1>
      <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-grey">These calculators work on their own. Inside the planner, the same formulas connect to your full profile.</p>

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="mb-8 text-2xl font-semibold tracking-tight">SIP calculator</h2>
        <SipPreview />
      </section>
      <section className="mt-16 border-t border-line pt-10">
        <h2 className="mb-8 text-2xl font-semibold tracking-tight">Loan EMI</h2>
        <EmiTool />
      </section>
      <section className="mt-16 border-t border-line pt-10">
        <h2 className="mb-8 text-2xl font-semibold tracking-tight">Inflation: today’s rupees vs future rupees</h2>
        <InflationTool />
      </section>
      <section className="mt-16 flex flex-col items-start gap-6 border-t border-line pt-10">
        <p className="max-w-2xl text-[15px] text-grey">
          The full planner adds goals, debt strategies, portfolio drift, a 20-year simulation, stress tests and financial-independence estimates.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('/start')}>Build My Wealth Plan</Button>
          <Button variant="secondary" onClick={() => explore('/app')}>
            Explore the Demo
          </Button>
        </div>
        <Disclaimer>Illustrative calculations only. Actual loan terms, returns and inflation will differ.</Disclaimer>
      </section>
    </div>
  );
}
