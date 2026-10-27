import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Download, Plus, Trash2 } from 'lucide-react';
import type { Assumptions, FinancialProfile } from '@/types/profile';
import { Field, MoneyInput, NumberInput, PercentInput, Select, TextInput, Toggle } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Misc';
import { CITIES, type CityKey } from '@/finance/cities';
import { formatCompact, formatINR } from '@/finance/money';
import { decodeOffer, newOffer, offersCsv, profileWithOffer, type Offer, type OfferResult } from '@/finance/offers';
import { usePlanJob } from '@/services/planWorker';
import { basicShareNote } from '@/features/editors/SalaryEditor';

const signed = (n: number, fmt: (v: number) => string) => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`;

/** Median net worth at the end of the plan (today's ₹) with this offer, from 300 simulated paths. */
function useOfferNetWorth(base: FinancialProfile, a: Assumptions, o: Offer): number | null {
  const profile = useMemo(() => profileWithOffer(base, o), [base, o]);
  const { data } = usePlanJob('ranges', profile, a, true, 500);
  return data ? data.netWorthReal.p50 : null;
}

function OfferInputs({ o, set, removable, onRemove }: { o: Offer; set: (patch: Partial<Offer>) => void; removable: boolean; onRemove: () => void }) {
  const note = basicShareNote(o.basicShare);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2">
        <Field label="Company" className="flex-1">
          {(id) => <TextInput id={id} value={o.label} maxLength={40} onChange={(e) => set({ label: e.target.value })} />}
        </Field>
        {removable && (
          <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={onRemove} aria-label={`Remove ${o.label}`}>
            <span className="sr-only">Remove</span>
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="CTC a year">{(id) => <MoneyInput id={id} value={o.ctc} max={1e9} onChange={(v) => set({ ctc: v })} />}</Field>
        <Field label="City">
          {(id) => (
            <Select id={id} value={o.city} onChange={(e) => set({ city: e.target.value as CityKey })}>
              {(Object.keys(CITIES) as CityKey[]).map((k) => (
                <option key={k} value={k}>
                  {CITIES[k].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Variable pay target">{(id) => <PercentInput id={id} value={o.variable.targetShare} max={60} onChange={(v) => set({ variable: { ...o.variable, targetShare: v } })} />}</Field>
        <Field label="Rent there, a month">{(id) => <MoneyInput id={id} value={o.rentMonthly} max={1e7} onChange={(v) => set({ rentMonthly: v })} />}</Field>
      </div>
      <details>
        <summary className="tap cursor-pointer text-[13px] font-medium text-forest">More details from the offer letter</summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Basic, share of CTC" hint={note ?? undefined}>{(id, d) => <PercentInput id={id} describedBy={d} value={o.basicShare} min={10} max={100} onChange={(v) => set({ basicShare: v })} />}</Field>
          <Field label="HRA, share of basic">{(id) => <PercentInput id={id} value={o.hraShareOfBasic} max={100} onChange={(v) => set({ hraShareOfBasic: v })} />}</Field>
          <Field label="Expected payout">{(id) => <PercentInput id={id} value={o.variable.expectedPayout} max={200} onChange={(v) => set({ variable: { ...o.variable, expectedPayout: v } })} />}</Field>
          <Field label="Employer NPS, of basic">{(id) => <PercentInput id={id} value={o.employerNpsShare} max={14} onChange={(v) => set({ employerNpsShare: v })} />}</Field>
          <Field label="Joining bonus">{(id) => <MoneyInput id={id} value={o.joiningBonus} max={1e8} onChange={(v) => set({ joiningBonus: v })} />}</Field>
          <Field label="Clawback, months">{(id) => <NumberInput native id={id} value={o.clawbackMonths} min={0} max={60} onChange={(v) => set({ clawbackMonths: v })} />}</Field>
          <Field label="ESOP grant a year" hint="Illiquid, uncertain. Never counted as cash.">{(id, d) => <MoneyInput id={id} describedBy={d} value={o.esopYearly} max={1e9} onChange={(v) => set({ esopYearly: v })} />}</Field>
          <Field label="Employer health cover">{(id) => <MoneyInput id={id} value={o.healthCover} max={1e8} onChange={(v) => set({ healthCover: v })} />}</Field>
          <Field label="Notice or relocation cost" className="col-span-2">{(id) => <MoneyInput id={id} value={o.oneOffCost} max={1e8} onChange={(v) => set({ oneOffCost: v })} />}</Field>
          <div className="col-span-2 flex flex-col gap-3">
            <Toggle checked={o.pfOnWageCeiling} onChange={(v) => set({ pfOnWageCeiling: v })} label="PF on the ₹25,000 wage ceiling" />
            <Toggle checked={o.gratuityInCtc} onChange={(v) => set({ gratuityInCtc: v })} label="Gratuity included in CTC" />
          </div>
        </div>
      </details>
    </div>
  );
}

function OfferOutputs({ r, nw, vs, refNw, refLabel }: { r: OfferResult; nw: number | null; vs?: OfferResult; refNw?: number | null; refLabel?: string }) {
  const rows: [string, string, string | null][] = [
    ['In-hand every month (fixed pay)', formatINR(r.monthlyInHand), vs ? signed(r.monthlyInHand - vs.monthlyInHand, formatINR) : null],
    ['In the month variable pay arrives', formatINR(r.bonusMonthCash), null],
    ['Year-1 total cash', formatCompact(r.year1Cash), vs ? signed(r.year1Cash - vs.year1Cash, formatCompact) : null],
    [`Income tax a year (${r.b.regime} regime)`, formatCompact(r.b.tax), null],
    ['Into EPF a year', formatCompact(r.b.epfCredit), null],
    ['Gratuity earned a year', formatCompact(r.b.gratuity), null],
    ['Left each month after rent and your spending', formatINR(r.leftAfterRentAndSpending), vs ? signed(r.leftAfterRentAndSpending - vs.leftAfterRentAndSpending, formatINR) : null],
    ['Net worth at the end of your plan, today’s ₹ (median)', nw === null ? '…' : formatCompact(nw), vs && nw !== null && refNw != null ? signed(nw - refNw, formatCompact) : null],
  ];
  return (
    <div className="flex flex-col gap-4">
      <dl className="divide-y divide-line/70 rounded-2xl ring-1 ring-inset ring-line">
        {rows.map(([k, v, d]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 px-3.5 py-2.5 text-[13px]">
            <dt className="text-grey">{k}</dt>
            <dd className="text-right">
              <span className="num font-semibold text-evergreen">{v}</span>
              {d && <span className={`num ml-2 text-[11.5px] ${d.startsWith('−') ? 'text-danger' : 'text-forest'}`}>{d}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {vs && refLabel && <p className="-mt-2 text-[11.5px] text-grey">Small figures compare with {refLabel}.</p>}
      {r.flags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Things to check">
          {r.flags.map((f) => (
            <li key={f.kind} className="rounded-xl bg-champagne/10 px-2.5 py-1.5 text-[12px] leading-snug text-charcoal ring-1 ring-inset ring-champagne/25">
              {f.text}
            </li>
          ))}
        </ul>
      )}
      {r.askHr.length > 0 && (
        <details className="rounded-2xl bg-muted/50 p-3.5">
          <summary className="tap cursor-pointer text-[13px] font-medium text-evergreen">Ask HR ({r.askHr.length})</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {r.askHr.map((h) => (
              <li key={h.key} className="text-[12.5px]">
                <span className="font-medium text-evergreen">{h.label}</span>
                <span className="num ml-1 text-forest">{formatCompact(h.yearly)} a year</span>
                <span className="block text-grey">{h.detail}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function OfferColumn(props: { base: FinancialProfile; a: Assumptions; o: Offer; spending: number; vs?: OfferResult; refNw?: number | null; refLabel?: string; children?: React.ReactNode }) {
  const { base, a, o, spending } = props;
  const r = useMemo(() => decodeOffer(o, spending), [o, spending]);
  const nw = useOfferNetWorth(base, a, o);
  return (
    <div className="flex flex-col gap-5">
      {props.children}
      <OfferOutputs r={r} nw={nw} vs={props.vs} refNw={props.refNw} refLabel={props.refLabel} />
    </div>
  );
}

/**
 * Up to three offers side by side, against your current job when there is one. Every figure comes from the
 * planner's salary engine; the net-worth line reruns your whole plan with that offer as your job.
 */
export function OfferCompare({ base, assumptions, current, spending, onUse, publicMode = false }: { base: FinancialProfile; assumptions: Assumptions; current: Offer | null; spending: number; onUse?: (o: Offer) => void; publicMode?: boolean }) {
  const [offers, setOffers] = useState<Offer[]>(() => [newOffer('a', 'Offer A', { city: current?.city ?? 'bengaluru', ctc: Math.round(((current?.ctc ?? 1_000_000) * 1.25) / 10_000) * 10_000, rentMonthly: current?.rentMonthly ?? 18_000, variable: { targetShare: 0.1, expectedPayout: 0.8 } })]);
  const set = (id: string, patch: Partial<Offer>) => setOffers((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const refOffer = current ?? offers[0];
  const ref = useMemo(() => decodeOffer(refOffer, spending), [refOffer, spending]);
  const refProfile = useMemo(() => profileWithOffer(base, refOffer), [base, refOffer]);
  const refNw = usePlanJob('ranges', refProfile, assumptions, true, 500).data?.netWorthReal.p50 ?? null;
  const refLabel = current ? 'your current job' : offers[0].label;
  const all = current ? [current, ...offers] : offers;

  const exportCsv = async () => {
    const results = all.map((o) => decodeOffer(o, spending));
    const { runJob } = await import('@/services/planWorker');
    const nws = await Promise.all(all.map((o) => runJob({ kind: 'ranges', profile: profileWithOffer(base, o), assumptions }).then((x) => x.netWorthReal.p50)));
    const blob = new Blob([offersCsv(results, nws)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'offer-comparison.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className={`grid gap-6 ${all.length >= 3 ? 'xl:grid-cols-3' : ''} ${all.length >= 2 ? 'lg:grid-cols-2' : ''}`}>
        {current && (
          <section aria-label="Current job" className="bezel p-5">
            <OfferColumn base={base} a={assumptions} o={current} spending={spending}>
              <div>
                <p className="text-[15px] font-semibold text-evergreen">Current job</p>
                <p className="text-[12.5px] text-grey">
                  {formatCompact(current.ctc)} CTC in {CITIES[current.city].label}, from your plan.
                </p>
              </div>
            </OfferColumn>
          </section>
        )}
        {offers.map((o, i) => (
          <section key={o.id} aria-label={o.label} className="bezel p-5">
            <OfferColumn base={base} a={assumptions} o={o} spending={spending} vs={current || i > 0 ? ref : undefined} refNw={refNw} refLabel={refLabel}>
              <OfferInputs o={o} set={(patch) => set(o.id, patch)} removable={offers.length > 1} onRemove={() => setOffers((os) => os.filter((x) => x.id !== o.id))} />
              {onUse && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    onUse(o);
                  }}
                >
                  Use this offer in my plan
                </Button>
              )}
              {publicMode && (
                <Link className="link inline-flex items-center gap-1 text-[13px] font-medium" to={`/start?ctc=${Math.round(o.ctc)}&city=${o.city}&rent=${Math.round(o.rentMonthly)}&spend=${Math.round(o.rentMonthly + spending)}`}>
                  See what this does to your 20-year plan <ArrowRight size={13} aria-hidden />
                </Link>
              )}
            </OfferColumn>
          </section>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {offers.length < 3 && (
          <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setOffers((os) => [...os, newOffer(String.fromCharCode(97 + os.length), `Offer ${String.fromCharCode(65 + os.length)}`, { city: os[0].city, ctc: os[0].ctc, rentMonthly: os[0].rentMonthly })])}>
            Add an offer
          </Button>
        )}
        <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={() => exportCsv().catch(() => toast('Couldn’t build the CSV. Try again.'))}>
          Export as CSV
        </Button>
      </div>
      <p className="text-[12px] leading-relaxed text-grey">
        In-hand uses the cheaper regime with no deductions beyond PF and HRA on the rent you enter. Net worth reruns your whole plan with this job, across 300 simulated market paths, and shows the middle outcome; it is not a forecast. ESOPs are never counted as cash.
      </p>
    </div>
  );
}
