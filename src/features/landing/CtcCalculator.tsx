import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Field, MoneyInput, PercentInput, Select } from '@/components/ui/Form';
import { DEFAULT_SALARY, salaryBreakdown } from '@/finance/tax';
import { CITIES, isHraMetro, type CityKey } from '@/finance/cities';
import { basicShareNote } from '@/features/editors/SalaryEditor';
import { formatINR } from '@/finance/money';
import { sectionLabel } from '@/finance/sections';

/** CTC in, real monthly in-hand out, on the same engine as the planner (tax year 2026-27, Labour Codes structure). */
export function CtcCalculator({ offerLink = '/tools/offer' }: { offerLink?: string }) {
  const [ctc, setCtc] = useState(1_200_000);
  const [city, setCity] = useState<CityKey>('bengaluru');
  const [basic, setBasic] = useState(DEFAULT_SALARY.basicShare);
  const [variable, setVariable] = useState(0.1);
  const b = useMemo(
    () => salaryBreakdown({ ...DEFAULT_SALARY, ctc, state: CITIES[city].state, cityIsMetro: isHraMetro(city), basicShare: basic, variablePay: { targetShare: variable, expectedPayout: 1 } }),
    [ctc, city, basic, variable],
  );
  const note = basicShareNote(basic);
  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
      <div className="grid content-start gap-5 sm:grid-cols-2 lg:col-span-5">
        <Field label="Annual CTC">{(id) => <MoneyInput id={id} value={ctc} max={1e9} onChange={setCtc} />}</Field>
        <Field label="City">
          {(id) => (
            <Select id={id} value={city} onChange={(e) => setCity(e.target.value as CityKey)}>
              {(Object.keys(CITIES) as CityKey[]).map((k) => (
                <option key={k} value={k}>
                  {CITIES[k].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Basic as a share of CTC" hint={note ?? undefined}>
          {(id, d) => <PercentInput id={id} describedBy={d} value={basic} min={10} max={100} onChange={setBasic} />}
        </Field>
        <Field label="Variable pay target">{(id) => <PercentInput id={id} value={variable} min={0} max={60} onChange={setVariable} />}</Field>
      </div>
      <div className="lg:col-span-7">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line" aria-live="polite">
          <div className="col-span-2 bg-surface p-5">
            <dt className="text-[13px] text-grey">In-hand every month</dt>
            <dd className="num mt-1 text-[36px] font-semibold leading-none tracking-[-0.04em] text-evergreen">{formatINR(b.monthlyInHand)}</dd>
          </div>
          <div className="bg-surface p-4">
            <dt className="text-[12.5px] text-grey">Variable pay, once a year</dt>
            <dd className="num mt-1 font-semibold text-evergreen">{formatINR(b.variablePaid)}</dd>
          </div>
          <div className="bg-surface p-4">
            <dt className="text-[12.5px] text-grey">Gratuity earned this year</dt>
            <dd className="num mt-1 font-semibold text-evergreen">{formatINR(b.gratuity)}</dd>
          </div>
          <div className="bg-surface p-4">
            <dt className="text-[12.5px] text-grey">PF, you + employer</dt>
            <dd className="num mt-1 font-semibold text-evergreen">{formatINR(b.employeePf + b.employerPf)}</dd>
          </div>
          <div className="bg-surface p-4">
            <dt className="text-[12.5px] text-grey">Income tax, {b.regime} regime</dt>
            <dd className="num mt-1 font-semibold text-evergreen">{formatINR(b.tax)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[12.5px] leading-relaxed text-grey">
          Gratuity is paid only when you leave after five years. The {b.regime} regime is cheaper here{b.taxNew !== b.taxOld ? ` by ${formatINR(Math.abs(b.taxNew - b.taxOld))} a year` : ''}; the old one assumes HRA on 40% of basic with no rent and no other deductions ({sectionLabel('80C')} counts your PF).
        </p>
        <Link to={offerLink} className="link mt-4 inline-flex items-center gap-1 text-[14px] font-medium">
          Compare two offers <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
