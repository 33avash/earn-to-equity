import { useMemo, useState } from 'react';
import { PublicHero } from '@/components/layout/PublicHero';
import { Field, MoneyInput, NumberInput } from '@/components/ui/Form';
import { Disclaimer } from '@/components/ui/Misc';
import { OfferCompare } from '@/features/offers/OfferCompare';
import { DEFAULT_ASSUMPTIONS } from '@/state/demo';
import { quickStartProfile } from '@/state/quickstart';

/**
 * The offer decoder without a plan: defaults stand in for your plan (age, spending, savings), and each offer ends
 * with a link to the quick start, pre-filled with that offer.
 */
export default function OfferTool() {
  const [age, setAge] = useState(24);
  const [spending, setSpending] = useState(20_000);
  const base = useMemo(() => quickStartProfile({ age, pay: 1_000_000, takeHome: false, city: 'bengaluru', spending, rent: 0, goal: 'fi', goalYear: new Date().getFullYear() + Math.max(5, 55 - age), goalCost: 0 }), [age, spending]);
  return (
    <>
      <PublicHero title={<>Decode an <span className="serif-accent">offer</span></>}>
        <p>CTC into what reaches your bank under this year’s rules: PF on the ₹25,000 ceiling, gratuity, variable pay, NPS, tax. Compare up to three offers. No sign-up; nothing leaves your browser.</p>
      </PublicHero>
      <div className="container-x flex flex-col gap-8 pb-10">
        <div className="grid max-w-xl gap-4 sm:grid-cols-2">
          <Field label="Your age">{(id) => <NumberInput native id={id} value={age} min={18} max={60} onChange={setAge} />}</Field>
          <Field label="Monthly spending, excluding rent" hint="Food, bills, transport, money sent home.">
            {(id, d) => <MoneyInput id={id} describedBy={d} value={spending} max={1e7} onChange={setSpending} />}
          </Field>
        </div>
        <OfferCompare base={base} assumptions={DEFAULT_ASSUMPTIONS} current={null} spending={spending} publicMode />
        <Disclaimer>A planning estimate, not a tax computation or a view on any employer. The net-worth line uses a starter plan with nothing saved yet; build your own plan for your real figures.</Disclaimer>
      </div>
    </>
  );
}
