import { usePlan } from '@/state/selectors';
import { useStore } from '@/state/store';
import { PageHeader, Section, Disclaimer } from '@/components/ui';
import { SalaryEditor } from '@/features/editors/SalaryEditor';

/** Salary & offers: your CTC broken down under the Labour Codes. */
export default function Offers() {
  const plan = usePlan();
  const update = useStore((s) => s.updateProfile);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Salary & offers" description="Where each rupee of your CTC goes: PF, gratuity, variable pay, NPS and tax, and what reaches your bank." />
      <Section title="Your salary" description="Changes here flow into every year of your plan.">
        <SalaryEditor p={plan.profile} update={update} />
      </Section>
      <Disclaimer>Tax figures follow the 2026-27 rules for a resident individual under 60. They are planning estimates, not a tax computation; check your payslip or Form 16.</Disclaimer>
    </div>
  );
}
