import type { FinancialProfile, SalaryStructure } from '@/types/profile';
import { Field, MoneyInput, PercentInput, Segmented, Select, Toggle } from '@/components/ui/Form';
import { LABOUR_CODES, STATE_NAMES, type StateCode } from '@/finance/assumptions';
import { CITIES, type CityKey } from '@/finance/cities';
import { DEFAULT_SALARY, salaryBreakdown } from '@/finance/tax';
import { salaryInputs } from '@/finance/income';
import { sectionLabel } from '@/finance/sections';
import { useMoney } from '@/state/selectors';
import type { RegimeChoice } from '@/finance/tax';

type Update = (fn: (d: FinancialProfile) => void) => void;

/** Non-blocking Labour Codes check on the basic share. */
export function basicShareNote(share: number): string | null {
  return share < LABOUR_CODES.value.minWageShare - 1e-9 ? 'Under the Labour Codes, basic + DA should be at least 50% of CTC. Check your offer letter.' : null;
}

/** City picker that also sets the state and city tier. */
export function CityField({ p, update }: { p: FinancialProfile; update: Update }) {
  return (
    <Field label="City" help="Sets professional tax, the health-cover benchmark and the HRA rule: 50% of basic in Delhi, Mumbai, Kolkata, Chennai, Bengaluru, Hyderabad, Pune and Ahmedabad, 40% elsewhere.">
      {(id) => (
        <Select
          id={id}
          value={p.about.city ?? ''}
          onChange={(e) =>
            update((x) => {
              const key = (e.target.value || undefined) as CityKey | undefined;
              x.about.city = key;
              if (key && key !== 'other') {
                x.about.cityTier = CITIES[key].tier;
                x.income.salary = { ...(x.income.salary ?? {}), state: CITIES[key].state };
              }
            })
          }
        >
          <option value="">Choose a city</option>
          {(Object.keys(CITIES) as CityKey[]).map((k) => (
            <option key={k} value={k}>
              {CITIES[k].label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

/**
 * Annual CTC in, monthly in-hand out: PF, gratuity, variable pay, NPS, professional tax and income tax under
 * both regimes. Switching to "Take-home" lets people who don't know their CTC enter what reaches their bank.
 */
export function SalaryEditor({ p, update, error }: { p: FinancialProfile; update: Update; error?: string | null }) {
  const money = useMoney();
  const mode = p.income.mode ?? 'takeHome';
  const s = p.income.salary ?? {};
  const setS = (patch: Partial<SalaryStructure>) => update((x) => void (x.income.salary = { ...(x.income.salary ?? {}), ...patch }));
  const b = mode === 'ctc' && (p.income.ctc ?? 0) > 0 ? salaryBreakdown(salaryInputs(p)) : null;
  const basicShare = s.basicShare ?? DEFAULT_SALARY.basicShare;
  const variable = s.variablePay ?? DEFAULT_SALARY.variablePay;
  const showState = !p.about.city || p.about.city === 'other';

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
          <Field label="Annual CTC" hint="Cost to company from your offer letter, including employer PF, gratuity and variable pay." error={error}>
            {(id, d, invalid) => <MoneyInput id={id} describedBy={d} invalid={invalid} value={p.income.ctc ?? 0} max={1e9} onChange={(v) => update((x) => void (x.income.ctc = v))} />}
          </Field>
          <CityField p={p} update={update} />
          {showState && (
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
          )}
          <Field label="Basic + DA as a share of CTC" help="EPF is 12% of basic, from you and from your employer, and gratuity is 4.81% of basic." hint={basicShareNote(basicShare) ?? 'At least 50% under the Labour Codes.'}>
            {(id, d) => <PercentInput id={id} describedBy={d} value={basicShare} min={10} max={100} onChange={(v) => setS({ basicShare: v })} />}
          </Field>
          <Field label="Tax regime" help={`You choose a regime each year with your employer. The new regime (${sectionLabel('115BAC')}) is the default.`}>
            {(id) => (
              <Select id={id} value={s.regime ?? 'auto'} onChange={(e) => setS({ regime: e.target.value as RegimeChoice })}>
                <option value="auto">Whichever is cheaper</option>
                <option value="new">New regime</option>
                <option value="old">Old regime</option>
              </Select>
            )}
          </Field>
          <Field label="Variable pay target" optional hint="Share of CTC paid as a yearly bonus at 100% payout.">
            {(id, d) => <PercentInput id={id} describedBy={d} value={variable.targetShare} min={0} max={60} onChange={(v) => setS({ variablePay: { ...variable, targetShare: v } })} />}
          </Field>
          <Field label="Expected payout" optional hint="How much of the target you expect to be paid. 80% is a cautious guess.">
            {(id, d) => <PercentInput id={id} describedBy={d} value={variable.expectedPayout} min={0} max={200} onChange={(v) => setS({ variablePay: { ...variable, expectedPayout: v } })} />}
          </Field>
          <div className="flex flex-col gap-4 sm:col-span-2">
            <Toggle checked={s.gratuityInCtc ?? true} onChange={(v) => setS({ gratuityInCtc: v })} label="Gratuity is part of my CTC" description="Most offer letters include it. It is never paid monthly; you receive it when you leave after the eligibility period." />
            <Toggle checked={s.pfOnWageCeiling ?? false} onChange={(v) => setS({ pfOnWageCeiling: v })} label="PF on the ₹25,000 wage ceiling" description="Some employers cap PF at 12% of ₹25,000 a month (₹3,000), which raises take-home and lowers your EPF." />
          </div>
          <details className="sm:col-span-2">
            <summary className="tap flex cursor-pointer items-center text-[13px] font-medium text-forest">NPS and HRA</summary>
            <div className="mt-4 grid gap-6 sm:grid-cols-3">
              <Field label="Employer NPS" optional hint={`Share of basic your employer puts in NPS. Deductible up to 14% in the new regime (${sectionLabel('80CCD(2)')}). Locked until 60.`}>
                {(id, d) => <PercentInput id={id} describedBy={d} value={s.employerNpsShare ?? 0} min={0} max={14} onChange={(v) => setS({ employerNpsShare: v })} />}
              </Field>
              <Field label="Your own NPS a year" optional hint={`Up to ₹50,000 is deductible in the old regime (${sectionLabel('80CCD(1B)')}).`}>
                {(id, d) => <MoneyInput id={id} describedBy={d} value={s.ownNpsYearly ?? 0} max={1e7} onChange={(v) => setS({ ownNpsYearly: v })} />}
              </Field>
              <Field label="HRA as a share of basic" optional hint="Usually 40–50%. Used to work out your HRA exemption from the rent in your budget.">
                {(id, d) => <PercentInput id={id} describedBy={d} value={s.hraShareOfBasic ?? DEFAULT_SALARY.hraShareOfBasic} min={0} max={100} onChange={(v) => setS({ hraShareOfBasic: v })} />}
              </Field>
            </div>
          </details>
          <details className="sm:col-span-2">
            <summary className="tap flex cursor-pointer items-center text-[13px] font-medium text-forest">Old-regime deductions</summary>
            <div className="mt-4 grid gap-6 sm:grid-cols-3">
              <Field label={`Other ${sectionLabel('80C')} a year`} hint="ELSS, PPF, life cover. EPF and home-loan principal are added for you; the limit is ₹1.5 L.">
                {(id, d) => <MoneyInput id={id} describedBy={d} value={s.other80C ?? 0} max={1e7} onChange={(v) => setS({ other80C: v })} />}
              </Field>
              <Field label={`Health premium a year, ${sectionLabel('80D')}`} hint="For you and your family, up to ₹25,000. Parents’ cover is on the protection step.">
                {(id, d) => <MoneyInput id={id} describedBy={d} value={s.sec80D ?? 0} max={1e6} onChange={(v) => setS({ sec80D: v })} />}
              </Field>
              <Field label={`HRA exemption override, ${sectionLabel('10(13A)')}`} optional hint="Leave at ₹0 to have it worked out from your rent and city. Enter your payslip figure to override.">
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

      {b && <SalarySummary b={b} money={money} />}
    </div>
  );
}

/** The CTC breakdown as a compact panel: where each rupee of CTC goes this year. */
export function SalarySummary({ b, money }: { b: ReturnType<typeof salaryBreakdown>; money: (n: number) => string }) {
  return (
    <div className="well p-5 sm:p-6">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-grey">Fixed pay</dt><dd className="num">{money(b.fixedGross)}</dd></div>
        <div><dt className="text-xs text-grey">PF (you + employer)</dt><dd className="num">{money(b.employeePf + b.employerPf)}</dd></div>
        <div><dt className="text-xs text-grey">Professional tax</dt><dd className="num">−{money(b.professionalTax)}</dd></div>
        <div><dt className="text-xs text-grey">Income tax ({b.regime} regime)</dt><dd className="num">−{money(b.tax)}</dd></div>
        {b.variablePaid > 0 && <div><dt className="text-xs text-grey">Variable pay, once a year</dt><dd className="num">{money(b.variablePaid)}</dd></div>}
        {b.employerNps + b.ownNps > 0 && <div><dt className="text-xs text-grey">NPS (locked until 60)</dt><dd className="num">{money(b.employerNps + b.ownNps)}</dd></div>}
        <div className="col-span-2"><dt className="text-xs text-grey">Gratuity (paid when you leave after the eligibility period)</dt><dd className="num">{money(b.gratuity)} a year</dd></div>
      </dl>
      <p className="mt-3 border-t border-line pt-3 text-sm">
        In-hand <strong className="num text-evergreen">{money(b.monthlyInHand)}</strong> a month{b.variableNet > 0 ? <>, plus about <span className="num">{money(b.variableNet)}</span> of variable pay once a year after tax</> : null}. {money(b.epfCredit)} a year goes into your EPF account.
      </p>
      <p className="mt-1 text-xs text-grey">
        New regime tax {money(b.taxNew)}, old regime {money(b.taxOld)}.{' '}
        {b.taxNew === b.taxOld ? 'Both cost the same.' : `The ${b.taxNew < b.taxOld ? 'new' : 'old'} regime saves ${money(Math.abs(b.taxNew - b.taxOld))} a year.`} Tax is recomputed every year of your projection as your pay grows.
      </p>
    </div>
  );
}
