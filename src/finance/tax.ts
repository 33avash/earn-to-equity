import { CESS, EPF_RULES, NEW_REGIME, OLD_REGIME, PROFESSIONAL_TAX, SURCHARGE, type Slab, type StateCode } from './assumptions';

export type Regime = 'new' | 'old';
export type RegimeChoice = Regime | 'auto';

function slabTax(income: number, slabs: Slab[]): number {
  let tax = 0;
  let floor = 0;
  for (const s of slabs) {
    if (income <= floor) break;
    tax += (Math.min(income, s.upTo) - floor) * s.rate;
    floor = s.upTo;
  }
  return tax;
}

/**
 * Income tax on taxable salary income for a resident individual under 60, tax year 2026-27:
 * slab tax, the rebate with marginal relief, surcharge with marginal relief, then 4% cess.
 */
export function incomeTax(taxable: number, regime: Regime): number {
  const t = Math.max(0, taxable);
  const r = regime === 'new' ? NEW_REGIME.value : OLD_REGIME.value;
  let tax = slabTax(t, r.slabs);
  if (t <= r.rebateLimit) tax = Math.max(0, tax - r.rebateMax);
  // Marginal relief: just above the rebate limit, tax can't exceed the income above the limit.
  else if (regime === 'new') tax = Math.min(tax, t - r.rebateLimit);

  const cap = r.surchargeCap;
  const bands = SURCHARGE.value.filter((b) => b.rate <= cap);
  const band = [...bands].reverse().find((b) => t > b.above);
  let total = tax;
  if (band) {
    const withSurcharge = tax * (1 + band.rate);
    // Marginal relief: the extra tax can't exceed the income above the threshold.
    const atThreshold = incomeTaxBeforeCess(band.above, regime);
    total = Math.min(withSurcharge, atThreshold + (t - band.above));
  }
  return total * (1 + CESS.value);
}

function incomeTaxBeforeCess(taxable: number, regime: Regime): number {
  return incomeTax(taxable, regime) / (1 + CESS.value);
}

/** Marginal tax rate (incl. cess) on the next rupee of income, used for slab-taxed gains. */
export function marginalRate(taxable: number, regime: Regime): number {
  const step = 10000;
  return (incomeTax(taxable + step, regime) - incomeTax(taxable, regime)) / step;
}

export interface SalaryInputs {
  ctc: number; // annual cost to company, INR
  basicShare: number; // basic as a share of CTC (default 0.4)
  pfOnWageCeiling: boolean; // PF computed on basic capped at ₹15,000 a month
  state: StateCode;
  regime: RegimeChoice;
  /** Old-regime deductions beyond employee PF. */
  other80C: number;
  sec80D: number;
  hraExemption: number;
}

export interface SalaryBreakdown {
  ctc: number;
  basic: number;
  employerPf: number; // total employer contribution (EPF + EPS)
  employeePf: number;
  eps: number; // part of employer's share that goes to the pension scheme, not the EPF account
  epfCredit: number; // employee + employer contributions that reach the EPF account
  gross: number; // CTC minus employer PF
  professionalTax: number;
  taxNew: number;
  taxOld: number;
  regime: Regime; // regime used
  tax: number;
  takeHome: number; // annual
  monthlyTakeHome: number;
}

export const DEFAULT_SALARY: Omit<SalaryInputs, 'ctc'> = {
  basicShare: 0.4,
  pfOnWageCeiling: false,
  state: 'MH',
  regime: 'auto',
  other80C: 0,
  sec80D: 0,
  hraExemption: 0,
};

/**
 * CTC → take-home for one year. CTC is assumed to be gross salary plus the employer's PF
 * contribution (gratuity and variable pay are ignored). Tax is computed under both regimes;
 * 'auto' uses the cheaper one.
 */
export function salaryBreakdown(input: SalaryInputs): SalaryBreakdown {
  const ctc = Math.max(0, input.ctc);
  const epf = EPF_RULES.value;
  const basic = ctc * Math.min(1, Math.max(0, input.basicShare));
  const pfWage = input.pfOnWageCeiling ? Math.min(basic, epf.wageCeiling * 12) : basic;
  const employerPf = pfWage * epf.employerRate;
  const employeePf = pfWage * epf.employeeRate;
  const eps = Math.min(pfWage, epf.wageCeiling * 12) * epf.epsRate;
  const gross = ctc - employerPf;
  const professionalTax = gross > 0 ? PROFESSIONAL_TAX.value[input.state] ?? PROFESSIONAL_TAX.value.OTHER : 0;

  const taxableNew = gross - NEW_REGIME.value.standardDeduction;
  const old = OLD_REGIME.value;
  const taxableOld =
    gross -
    old.standardDeduction -
    professionalTax -
    Math.min(old.sec80cLimit, employeePf + Math.max(0, input.other80C)) -
    Math.min(old.sec80dLimit, Math.max(0, input.sec80D)) -
    Math.max(0, input.hraExemption);
  const taxNew = incomeTax(taxableNew, 'new');
  const taxOld = incomeTax(taxableOld, 'old');
  const regime: Regime = input.regime === 'auto' ? (taxOld < taxNew ? 'old' : 'new') : input.regime;
  const tax = regime === 'new' ? taxNew : taxOld;
  const takeHome = gross - employeePf - professionalTax - tax;
  return {
    ctc,
    basic,
    employerPf,
    employeePf,
    eps,
    epfCredit: employeePf + employerPf - eps,
    gross,
    professionalTax,
    taxNew,
    taxOld,
    regime,
    tax,
    takeHome,
    monthlyTakeHome: takeHome / 12,
  };
}

/** Taxable income behind a breakdown, for the marginal rate on slab-taxed investment gains. */
export function taxableIncome(b: SalaryBreakdown): number {
  return b.regime === 'new' ? b.gross - NEW_REGIME.value.standardDeduction : b.gross - OLD_REGIME.value.standardDeduction - b.professionalTax;
}
