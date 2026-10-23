import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PublicHero } from '@/components/layout/PublicHero';
import { Reveal } from '@/components/motion/Motion';
import { SipPreview } from '@/features/sip/SipPreview';
import { MoneyInput, PercentInput, Field, NumberInput, Stat, Disclaimer, Button, Bezel } from '@/components/ui';
import { emi, inflate, toReal } from '@/finance/rates';
import { formatINR, formatPct } from '@/finance/money';
import { useExploreDemo } from '@/state/useDemo';

function EmiTool() {
  const [p, setP] = useState(2000000);
  const [r, setR] = useState(0.09);
  const [y, setY] = useState(10);
  const e = emi(p, r, y * 12);
  return (
    <div className="grid gap-10 md:grid-cols-2 md:gap-14">
      <div className="grid content-start gap-6">
        <Field label="Loan amount">{(id) => <MoneyInput id={id} value={p} onChange={setP} max={1e9} />}</Field>
        <Field label="Interest rate (APR)">{(id) => <PercentInput id={id} value={r} onChange={setR} max={60} />}</Field>
        <Field label="Tenure (years)">{(id) => <NumberInput native id={id} value={y} onChange={(v) => Number.isFinite(v) && setY(v)} min={1} max={40} />}</Field>
      </div>
      <div className="well grid grid-cols-2 content-start gap-8 p-6 sm:p-8">
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
    <div className="grid gap-10 md:grid-cols-2 md:gap-14">
      <div className="grid content-start gap-6">
        <Field label="Amount in today’s rupees">{(id) => <MoneyInput id={id} value={amt} onChange={setAmt} max={1e10} />}</Field>
        <Field label="Inflation">{(id) => <PercentInput id={id} value={infl} onChange={setInfl} max={20} />}</Field>
        <Field label="Years">{(id) => <NumberInput native id={id} value={y} onChange={(v) => Number.isFinite(v) && setY(v)} min={1} max={50} />}</Field>
      </div>
      <div className="well grid content-start gap-8 p-6 sm:p-8">
        <Stat label={`Will cost in ${y} years`} value={formatINR(r.future)} />
        <Stat label={`${formatINR(amt)} received in ${y} years is worth today`} value={formatINR(r.real)} />
      </div>
    </div>
  );
}

function ToolSection({ n, title, children }: { n: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <Reveal as="section" className="grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-3">
        <span className="num text-sm text-grey">{n}</span>
        <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.03em]">{title}</h2>
      </div>
      <Bezel className="p-6 sm:p-10 lg:col-span-9">{children}</Bezel>
    </Reveal>
  );
}

export default function Tools() {
  const explore = useExploreDemo();
  const navigate = useNavigate();
  return (
    <>
      <PublicHero tag="Calculators" title={<span className="serif-accent">Calculators</span>}>
        <p>An SIP, a loan EMI and inflation, without building a plan first. The planner uses the same formulas.</p>
      </PublicHero>

      <div className="container-x flex flex-col gap-20 lg:gap-28">
        <ToolSection n="01" title="SIP calculator">
          <SipPreview />
        </ToolSection>
        <ToolSection n="02" title="Loan EMI">
          <EmiTool />
        </ToolSection>
        <ToolSection n="03" title="Inflation: today’s rupees vs future rupees">
          <InflationTool />
        </ToolSection>
        <section className="flex flex-col items-start gap-6 lg:ml-[25%] lg:pl-3">
          <p className="max-w-2xl text-[17px] leading-relaxed text-grey">A plan adds tax on your CTC, EPF, goals, loans, a 20-year projection and stress tests.</p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate('/start')}>
              Build your plan <ArrowRight size={16} aria-hidden />
            </Button>
            <Button size="lg" variant="secondary" onClick={() => explore('/app')}>
              See the demo plan
            </Button>
          </div>
          <Disclaimer>Illustrative calculations only. Actual loan terms, returns and inflation will differ.</Disclaimer>
        </section>
      </div>
    </>
  );
}
