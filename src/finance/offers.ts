import type { Assumptions, FinancialProfile } from '@/types/profile';
import { HEALTH_COVER_BENCHMARK, LABOUR_CODES, GRATUITY, EMPLOYER_NPS } from './assumptions';
import { CITIES, isHraMetro, type CityKey } from './cities';
import { rentMonthly, usesCtc } from './income';
import { formatCompact } from './money';
import { DEFAULT_SALARY, marginalRate, salaryBreakdown, type SalaryBreakdown, type SalaryInputs } from './tax';
import { simulate } from './simulate';

/*
 * Offer decoder: what a job offer pays in your hand, built only from the Phase 1 salary engine, and what it does to
 * your 20-year plan. ESOPs are shown for information and never counted as cash.
 */

export interface Offer {
  id: string;
  label: string; // e.g. the company name
  city: CityKey;
  ctc: number;
  basicShare: number;
  hraShareOfBasic: number;
  pfOnWageCeiling: boolean;
  gratuityInCtc: boolean;
  employerNpsShare: number;
  variable: { targetShare: number; expectedPayout: number };
  joiningBonus: number;
  clawbackMonths: number; // repay the joining bonus if you leave within this many months (0 = no clawback)
  esopYearly: number; // value of the yearly grant as stated; illiquid and uncertain, never counted as cash
  healthCover: number; // employer group health cover
  rentMonthly: number; // expected rent in that city
  oneOffCost: number; // notice buy-out, relocation and similar, paid once
}

export const newOffer = (id: string, label: string, partial: Partial<Offer> = {}): Offer => ({
  id,
  label,
  city: 'bengaluru',
  ctc: 1_200_000,
  basicShare: DEFAULT_SALARY.basicShare,
  hraShareOfBasic: DEFAULT_SALARY.hraShareOfBasic,
  pfOnWageCeiling: false,
  gratuityInCtc: true,
  employerNpsShare: 0,
  variable: { targetShare: 0, expectedPayout: 1 },
  joiningBonus: 0,
  clawbackMonths: 0,
  esopYearly: 0,
  healthCover: 500_000,
  rentMonthly: 0,
  oneOffCost: 0,
  ...partial,
});

/** The salary-engine inputs for an offer. */
export function offerInputs(o: Offer): SalaryInputs {
  return {
    ...DEFAULT_SALARY,
    ctc: o.ctc,
    basicShare: o.basicShare,
    hraShareOfBasic: o.hraShareOfBasic,
    pfOnWageCeiling: o.pfOnWageCeiling,
    gratuityInCtc: o.gratuityInCtc,
    employerNpsShare: o.employerNpsShare,
    variablePay: o.variable,
    state: CITIES[o.city].state,
    cityIsMetro: isHraMetro(o.city),
    rentMonthly: o.rentMonthly,
  };
}

/** The current job as an offer, read from the profile (CTC plans only). */
export function offerFromProfile(p: FinancialProfile): Offer | null {
  if (!usesCtc(p)) return null;
  const s = { ...DEFAULT_SALARY, ...(p.income.salary ?? {}) };
  return newOffer('current', 'Current job', {
    city: p.about.city ?? 'other',
    ctc: p.income.ctc ?? 0,
    basicShare: s.basicShare,
    hraShareOfBasic: s.hraShareOfBasic,
    pfOnWageCeiling: s.pfOnWageCeiling,
    gratuityInCtc: s.gratuityInCtc,
    employerNpsShare: s.employerNpsShare,
    variable: { ...DEFAULT_SALARY.variablePay, ...(s.variablePay ?? {}) },
    healthCover: p.protection.healthCover,
    rentMonthly: rentMonthly(p),
  });
}

export type OfferFlagKind = 'basic' | 'variable' | 'clawback' | 'pf-cap' | 'gratuity' | 'health' | 'esop';

export interface OfferFlag {
  kind: OfferFlagKind;
  text: string;
}

export interface AskHr {
  key: 'nps' | 'pf' | 'hra';
  label: string;
  /** Rupees a year: tax saved, or (for PF) more into EPF. */
  yearly: number;
  detail: string;
}

export interface OfferResult {
  offer: Offer;
  b: SalaryBreakdown;
  monthlyInHand: number;
  bonusMonthCash: number; // in-hand in the month variable pay arrives
  joiningBonusNet: number; // after tax at your marginal rate
  year1Cash: number; // twelve months of in-hand + variable + joining bonus − one-off costs
  leftAfterRentAndSpending: number; // monthly: in-hand − rent − your other spending
  flags: OfferFlag[];
  askHr: AskHr[];
}

/** Everything an offer pays, and the plain-language flags. `otherSpending` is your monthly spending excluding rent. */
export function decodeOffer(o: Offer, otherSpending: number): OfferResult {
  const b = salaryBreakdown(offerInputs(o));
  const joiningBonusNet = o.joiningBonus * (1 - marginalRate(b.taxable, b.regime));
  const year1Cash = b.annualCash + joiningBonusNet - o.oneOffCost;
  const flags: OfferFlag[] = [];
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  if (o.basicShare < LABOUR_CODES.value.minWageShare - 1e-9) flags.push({ kind: 'basic', text: `Basic is ${pct(o.basicShare)} of CTC, below the Labour Codes’ 50%. Expect it to be raised, which lowers in-hand pay.` });
  if (o.variable.targetShare > 0.2 + 1e-9) flags.push({ kind: 'variable', text: `${pct(o.variable.targetShare)} of CTC is variable. Only ${pct(o.variable.expectedPayout)} of it is assumed to be paid.` });
  if (o.joiningBonus > 0 && o.clawbackMonths > 0) flags.push({ kind: 'clawback', text: `The joining bonus is clawed back if you leave within ${o.clawbackMonths} months.` });
  if (o.pfOnWageCeiling) flags.push({ kind: 'pf-cap', text: 'PF is on the ₹25,000 wage ceiling, so less goes into your EPF each month.' });
  if (b.gratuity > 0) flags.push({ kind: 'gratuity', text: `Gratuity (${formatCompact(b.gratuity)} a year) is paid only after ${GRATUITY.value.eligibilityYears} years of service${o.gratuityInCtc ? ', though it counts in CTC' : ''}.` });
  const benchmark = HEALTH_COVER_BENCHMARK.value[CITIES[o.city].tier];
  if (o.healthCover < benchmark) flags.push({ kind: 'health', text: `Employer health cover of ${formatCompact(o.healthCover)} is below the ${formatCompact(benchmark)} benchmark for ${CITIES[o.city].label}.` });
  if (o.esopYearly > 0) flags.push({ kind: 'esop', text: `ESOPs of ${formatCompact(o.esopYearly)} a year are illiquid and uncertain; they are not counted as cash.` });

  const askHr: AskHr[] = [];
  if (o.employerNpsShare < EMPLOYER_NPS.value.newRegimeCap - 1e-9) {
    const with14 = salaryBreakdown({ ...offerInputs(o), employerNpsShare: EMPLOYER_NPS.value.newRegimeCap });
    const saved = b.tax - with14.tax;
    if (saved > 100) askHr.push({ key: 'nps', label: 'Put 14% of basic into employer NPS', yearly: saved, detail: `Saves ${formatCompact(saved)} a year in tax; ${formatCompact(with14.employerNps)} a year goes to NPS, locked until 60.` });
  }
  const otherPf = salaryBreakdown({ ...offerInputs(o), pfOnWageCeiling: !o.pfOnWageCeiling });
  if (Math.abs(otherPf.epfCredit - b.epfCredit) > 100)
    askHr.push(
      o.pfOnWageCeiling
        ? { key: 'pf', label: 'PF on full basic instead of the ₹25,000 ceiling', yearly: otherPf.epfCredit - b.epfCredit, detail: `${formatCompact(otherPf.epfCredit - b.epfCredit)} more a year into EPF; in-hand falls by ${formatCompact((b.monthlyInHand - otherPf.monthlyInHand) * 12)} a year.` }
        : { key: 'pf', label: 'PF on the ₹25,000 ceiling instead of full basic', yearly: (otherPf.monthlyInHand - b.monthlyInHand) * 12, detail: `${formatCompact((otherPf.monthlyInHand - b.monthlyInHand) * 12)} more in-hand a year, but ${formatCompact(b.epfCredit - otherPf.epfCredit)} less into EPF.` },
    );
  if (o.rentMonthly > 0 && o.hraShareOfBasic < 0.5 - 1e-9) {
    const hra50 = salaryBreakdown({ ...offerInputs(o), hraShareOfBasic: 0.5, regime: 'old' });
    const old = salaryBreakdown({ ...offerInputs(o), regime: 'old' });
    const saved = old.tax - hra50.tax;
    if (saved > 100) askHr.push({ key: 'hra', label: 'Raise HRA to 50% of basic (old regime)', yearly: saved, detail: `Saves ${formatCompact(saved)} a year if you file under the old regime, because more of your rent becomes exempt.` });
  }
  return {
    offer: o,
    b,
    monthlyInHand: b.monthlyInHand,
    bonusMonthCash: b.monthlyInHand + b.variableNet,
    joiningBonusNet,
    year1Cash,
    leftAfterRentAndSpending: b.monthlyInHand - o.rentMonthly - Math.max(0, otherSpending),
    flags,
    askHr,
  };
}

/** Your monthly spending other than rent, from the profile. */
export function otherSpending(p: FinancialProfile): number {
  const all = [...p.cashflow.essential, ...p.cashflow.lifestyle].reduce((s, l) => s + Math.max(0, l.amount), 0);
  return Math.max(0, all - rentMonthly(p));
}

/**
 * The plan with this offer as the job: CTC, salary structure, city and rent change; the joining bonus (after tax)
 * and the one-off cost land in savings now. Everything else in the plan stays.
 */
export function profileWithOffer(p: FinancialProfile, o: Offer): FinancialProfile {
  const q = structuredClone(p);
  const city = CITIES[o.city];
  q.about.city = o.city;
  if (o.city !== 'other') q.about.cityTier = city.tier;
  q.income.mode = 'ctc';
  q.income.ctc = o.ctc;
  q.income.salary = {
    ...(q.income.salary ?? {}),
    state: city.state,
    basicShare: o.basicShare,
    hraShareOfBasic: o.hraShareOfBasic,
    pfOnWageCeiling: o.pfOnWageCeiling,
    gratuityInCtc: o.gratuityInCtc,
    employerNpsShare: o.employerNpsShare,
    variablePay: { ...o.variable },
  };
  const rent = q.cashflow.essential.find((l) => l.id === 'rent');
  if (rent) rent.amount = o.rentMonthly;
  else if (o.rentMonthly > 0) q.cashflow.essential.unshift({ id: 'rent', label: 'Rent', amount: o.rentMonthly });
  const d = decodeOffer(o, 0);
  q.position.cashSavings = Math.max(0, q.position.cashSavings + d.joiningBonusNet - o.oneOffCost);
  return q;
}

/** Base-case net worth at the end of the horizon, today's rupees, with this offer. */
export function offerNetWorth(p: FinancialProfile, a: Assumptions, o: Offer): number {
  return simulate(profileWithOffer(p, o), a).points.at(-1)!.netWorthReal;
}

/** A CSV of the comparison: one row per measure, one column per offer. */
export function offersCsv(results: OfferResult[], netWorth: (number | null)[]): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const r = (n: number) => String(Math.round(n));
  const rows: [string, (x: OfferResult, i: number) => string][] = [
    ['City', (x) => CITIES[x.offer.city].label],
    ['CTC', (x) => r(x.offer.ctc)],
    ['Monthly in-hand (fixed pay)', (x) => r(x.monthlyInHand)],
    ['Bonus-month cash', (x) => r(x.bonusMonthCash)],
    ['Year-1 total cash', (x) => r(x.year1Cash)],
    ['Income tax a year', (x) => r(x.b.tax)],
    ['Regime', (x) => x.b.regime],
    ['To EPF a year', (x) => r(x.b.epfCredit)],
    ['Gratuity earned a year', (x) => r(x.b.gratuity)],
    ['Left each month after rent and spending', (x) => r(x.leftAfterRentAndSpending)],
    ['Net worth at end of plan, today’s rupees (median)', (_x, i) => (netWorth[i] == null ? '' : r(netWorth[i]!))],
    ['ESOP a year (not counted as cash)', (x) => r(x.offer.esopYearly)],
    ['Flags', (x) => x.flags.map((f) => f.text).join(' ')],
  ];
  const header = ['Measure', ...results.map((x) => x.offer.label)];
  return [header, ...rows.map(([label, f]) => [label, ...results.map((x, i) => f(x, i))])].map((row) => row.map(esc).join(',')).join('\n');
}
