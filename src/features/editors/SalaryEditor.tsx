import type { FinancialProfile, SalaryStructure } from '@/types/profile';
import { Field, MoneyInput, PercentInput, Segmented, Select, Toggle } from '@/components/ui/Form';
import { STATE_NAMES, type StateCode } from '@/finance/assumptions';
import { salaryBreakdown } from '@/finance/tax';
import { salaryInputs } from '@/finance/income';
import { useMoney } from '@/state/selectors';
import type { RegimeChoice } from '@/finance/tax';

type Update = (fn: (d: FinancialProfile) => void) => void;

/**
 * Annual CTC in, monthly take-home out: PF, professional tax and income tax under both regimes.
 * Switching to "Take-home" lets people who don't know their CTC enter what reaches their bank.
 */
export function SalaryEditor({ p, update, error }: { p: FinancialProfile; update: Update; error?: string | null }) {
  const money = useMoney();
  const mode = p.income.mode ?? 'takeHome';
  const s = p.income.salary ?? {};
  const setS = (patch: Partial<SalaryStructure>) => update((x) => void (x.income.salary = { ...(x.income.salary ?? {}), ...patch }));
  const b = mode === 'ctc' && (p.income.ctc ?? 0) > 0 ? salaryBreakdown(salaryInputs(p)) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-[13px] font-medium">How do you know your pay?</p>
        <Segmented
          label="Salary input"
          value={mode}
          onChange={(v) => update((x) => void (x.income.mode = v))}
          options={[
            { value: 'ctc', label: 'Annual CTC' },
            { value: 'takeHome', label: 'Monthly take-home' },
          ]}
        />
      </div>

      {mode === 'ctc' ? (
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Annual CTC" hint="Cost to company from your offer letter, including employer PF." error={error}>
            {(id, d, invalid) => <MoneyInput id={id} describedBy={d} invalid={invalid} value={p.income.ctc ?? 0} max={1e9} onChange={(v) => update((x) => void (x.income.ctc = v))} />}
          </Field>
          <Field label="State" help="Sets professional tax. Delhi, Haryana and Uttar Pradesh don’t levy it.">
            {(id) => (
              <Select id={id} value={s.state ?? 'MH'} onChange={(e) => setS({ state: e.target.value as StateCode })}>
                {(Object.keys(STATE_NAMES) as StateCode[]).map((k) => (
                  <option key={k} value={k}>
                    {STATE_NAMES[k]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Basic pay as a share of CTC" help="Usually 40–50%. EPF is 12% of basic, from you and from your employer.">
            {(id) => <PercentInput id={id} value={s.basicShare ?? 0.4} min={10} max={100} onChange={(v) => setS({ basicShare: v })} />}
          </Field>
          <Field label="Tax regime">
            {(id) => (
              <Select id={id} value={s.regime ?? 'auto'} onChange={(e) => setS({ regime: e.target.value as RegimeChoice })}>
                <option value="auto">Whichever is cheaper</option>
                <option value="new">New regime</option>
                <option value="old">Old regime</option>
              </Select>
            )}
          </Field>
          <div className="sm:col-span-2">
            <Toggle checked={s.pfOnWageCeiling ?? false} onChange={(v) => setS({ pfOnWageCeiling: v })} label="PF on the ₹15,000 wage ceiling" description="Some employers cap PF at 12% of ₹15,000 a month (₹1,800), which raises take-home and lowers your EPF." />
          </div>
          <details className="sm:col-span-2">
            <summary className="tap flex cursor-pointer items-center text-[13px] font-medium text-forest">Old-regime deductions</summary>
            <div className="mt-4 grid gap-6 sm:grid-cols-3">
              <Field label="Other 80C a year" hint="ELSS, PPF, life cover. EPF is added for you; the limit is ₹1.5 L.">
                {(id, d) => <MoneyInput id={id} describedBy={d} value={s.other80C ?? 0} max={1e7} onChange={(v) => setS({ other80C: v })} />}
              </Field>
              <Field label="80D health premium a year" hint="Up to ₹25,000 for you and family.">
                {(id, d) => <MoneyInput id={id} describedBy={d} value={s.sec80D ?? 0} max={1e6} onChange={(v) => setS({ sec80D: v })} />}
              </Field>
              <Field label="HRA exemption a year" hint="From your payslip or Form 16.">
                {(id, d) => <MoneyInput id={id} describedBy={d} value={s.hraExemption ?? 0} max={1e7} onChange={(v) => setS({ hraExemption: v })} />}
              </Field>
            </div>
          </details>
        </div>
      ) : (
        <Field label="Monthly take-home salary" hint="After tax, PF and other payroll deductions: what reaches your bank account." error={error}>
          {(id, d, invalid) => <MoneyInput id={id} describedBy={d} invalid={invalid} value={p.income.monthlyTakeHome} max={1e8} onChange={(v) => update((x) => void (x.income.monthlyTakeHome = v))} />}
        </Field>
      )}

      {b && (
        <div className="well p-5 sm:p-6">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-grey">Gross salary</dt><dd className="num">{money(b.gross)}</dd></div>
            <div><dt className="text-xs text-grey">Your PF</dt><dd className="num">−{money(b.employeePf)}</dd></div>
            <div><dt className="text-xs text-grey">Professional tax</dt><dd className="num">−{money(b.professionalTax)}</dd></div>
            <div><dt className="text-xs text-grey">Income tax ({b.regime} regime)</dt><dd className="num">−{money(b.tax)}</dd></div>
          </dl>
          <p className="mt-3 border-t border-line pt-3 text-sm">
            Take-home <strong className="num text-evergreen">{money(b.monthlyTakeHome)}</strong> a month. {money(b.epfCredit)} a year goes into your EPF account.
          </p>
          <p className="mt-1 text-xs text-grey">
            New regime tax {money(b.taxNew)}, old regime {money(b.taxOld)}.{' '}
            {b.taxNew === b.taxOld ? 'Both cost the same.' : `The ${b.taxNew < b.taxOld ? 'new' : 'old'} regime saves ${money(Math.abs(b.taxNew - b.taxOld))} a year.`} Tax is recomputed every year of your projection as your pay grows.
          </p>
        </div>
      )}
    </div>
  );
}
