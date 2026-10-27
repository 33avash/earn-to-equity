import { usePlan } from '@/state/selectors';
import { useStore } from '@/state/store';
import { PageHeader, Section, Disclaimer, toast } from '@/components/ui';
import { SalaryEditor } from '@/features/editors/SalaryEditor';
import { OfferCompare } from '@/features/offers/OfferCompare';
import { RegimeTimeline } from '@/features/tax/RegimeTimeline';
import { offerFromProfile, otherSpending, profileWithOffer, type Offer } from '@/finance/offers';

/** Salary & offers: your CTC broken down, offers compared side by side, and the regime for each year. */
export default function Offers() {
  const plan = usePlan();
  const update = useStore((s) => s.updateProfile);
  const replacePlan = useStore((s) => s.replacePlan);
  const current = offerFromProfile(plan.profile);

  const use = (o: Offer) => {
    const prev = replacePlan(profileWithOffer(plan.profile, o), plan.assumptions);
    toast(`Your plan now uses ${o.label}.`, { duration: 8000, action: { label: 'Undo', onClick: () => replacePlan(prev.profile, prev.assumptions) } });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Salary & offers" description="Where each rupee of your CTC goes, how an offer compares with your current job, and the cheaper tax regime for each year of your plan." />

      <Section title="Compare offers" description="Up to three offers against your current job. Inputs start with the essentials; open “More details” for the rest of the offer letter.">
        <OfferCompare base={plan.profile} assumptions={plan.assumptions} current={current} spending={otherSpending(plan.profile)} onUse={use} />
      </Section>

      <Section title="Tax regime, year by year" description="Worked out from your projection: salary growth, rent, home loans and other deductions in each year.">
        <RegimeTimeline sim={plan.sim} />
      </Section>

      <Section title="Your salary" description="Changes here flow into every year of your plan.">
        <SalaryEditor p={plan.profile} update={update} />
      </Section>

      <Disclaimer>Tax figures follow the 2026-27 rules for a resident individual under 60. They are planning estimates, not a tax computation; check your payslip or Form 16. Nothing here rates an employer or recommends a product.</Disclaimer>
    </div>
  );
}
