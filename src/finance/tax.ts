import { CESS, EMPLOYER_NPS, EPF_RULES, GRATUITY, HRA_RULES, NEW_REGIME, OLD_REGIME, PROFESSIONAL_TAX, SURCHARGE, type Slab, type StateCode } from './assumptions';

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
 * slab tax, the rebate (section 156, old 87A) with marginal relief, surcharge with marginal relief, then 4% cess.
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

export interface VariablePay {
  targetShare: number; // variable pay at 100% payout, as a share of CTC
  expectedPayout: number; // share of the target you expect to be paid (1 = 100%)
}

export interface SalaryInputs {
  ctc: number; // annual cost to company, INR
  basicShare: number; // basic + DA as a share of CTC (default 0.5, the Labour Codes floor)
  pfOnWageCeiling: boolean; // PF computed on basic capped at ₹25,000 a month
  state: StateCode;
  regime: RegimeChoice;
  /** Gratuity provision (4.81% of basic) is part of CTC but never paid monthly. */
  gratuityInCtc: boolean;
  variablePay: VariablePay;
  /** Employer NPS contribution as a share of basic, carved out of CTC (section 124, old 80CCD(2)). */
  employerNpsShare: number;
  /** Your own NPS contribution a year, paid from salary (old 80CCD(1B), old regime only). */
  ownNpsYearly: number;
  /** HRA as a share of basic; used to work out the old-regime exemption. */
  hraShareOfBasic: number;
  rentMonthly: number;
  cityIsMetro: boolean; // HRA: 50% of basic in the eight listed cities, 40% elsewhere
  /** Old-regime deductions beyond employee PF. */
  other80C: number;
  sec80D: number;
  sec80DParents: number; // premium paid for parents a year
  parentsSenior: boolean;
  /** Annual HRA exemption typed in by hand. 0 means the planner calculates it from rent. */
  hraExemption: number;
  /** Interest and principal repaid this year on a home loan for a self-occupied house (from the projection). */
  homeLoanInterest: number;
  homeLoanPrincipal: number;
}

export interface SalaryBreakdown {
  ctc: number;
  basic: number;
  employerPf: number; // total employer contribution (EPF + EPS)
  employeePf: number;
  eps: number; // part of employer's share that goes to the pension scheme, not the EPF account
  epfCredit: number; // employee + employer contributions that reach the EPF account
  employerNps: number; // part of CTC that goes to NPS
  ownNps: number; // your own NPS contribution, paid from salary
  gratuity: number; // gratuity earned this year (paid when you leave after the eligibility period)
  variableTarget: number; // variable pay at 100% payout, part of CTC
  variablePaid: number; // variable pay expected this year, paid once a year
  fixedGross: number; // CTC minus employer PF, employer NPS, gratuity (if in CTC) and variable target
  gross: number; // cash salary before deductions: fixed gross + variable paid
  hra: number;
  hraExemption: number; // what the old regime allows, whichever regime is used
  homeLoanInterestDeduction: number; // what the old regime allows, whichever regime is used
  sec123Deduction: number; // Sec 123 (old 80C) used by the old regime: PF, other investments, home-loan principal
  perquisiteExcess: number; // employer PF + NPS above ₹7.5 L, taxed as salary
  professionalTax: number;
  taxNew: number;
  taxOld: number;
  regime: Regime; // regime used
  tax: number;
  taxable: number; // taxable income under the regime used
  monthlyInHand: number; // fixed pay only, after PF, professional tax, your NPS and the tax on fixed pay
  variableNet: number; // variable pay after the extra tax it causes
  annualCash: number; // twelve months of in-hand plus the variable payout
  takeHome: number; // annual, same as annualCash
  monthlyTakeHome: number; // same as monthlyInHand: what reaches your bank in a normal month
}

export const DEFAULT_SALARY: Omit<SalaryInputs, 'ctc'> = {
  basicShare: 0.5,
  pfOnWageCeiling: false,
  state: 'MH',
  regime: 'auto',
  gratuityInCtc: true,
  variablePay: { targetShare: 0, expectedPayout: 1 },
  employerNpsShare: 0,
  ownNpsYearly: 0,
  hraShareOfBasic: 0.4,
  rentMonthly: 0,
  cityIsMetro: true,
  other80C: 0,
  sec80D: 0,
  sec80DParents: 0,
  parentsSenior: false,
  hraExemption: 0,
  homeLoanInterest: 0,
  homeLoanPrincipal: 0,
};

const pos = (x: number) => Math.max(0, x || 0);

/**
 * HRA exemption (old regime, old section 10(13A)): the least of HRA received, rent paid minus 10% of basic,
 * and 50% of basic in the eight listed cities (40% elsewhere).
 */
export function hraExemption(hraReceived: number, rentYearly: number, basic: number, metro: boolean): number {
  const r = HRA_RULES.value;
  if (rentYearly <= 0 || hraReceived <= 0) return 0;
  return Math.max(0, Math.min(hraReceived, rentYearly - r.rentFloorShare * basic, (metro ? r.metroShare : r.otherShare) * basic));
}

/**
 * CTC → in-hand pay for one year.
 *
 * CTC is carved up in this order: employer PF, employer NPS, gratuity (when it is part of CTC) and the
 * variable-pay target. What is left is fixed gross pay, paid monthly. Variable pay is paid once a year at
 * target × expected payout and taxed in that year; the extra tax it causes comes out of the payout, so the
 * monthly in-hand figure covers fixed pay only. Gratuity is earned every year but paid only when you leave.
 * Tax is computed under both regimes; 'auto' uses the cheaper one.
 */
export function salaryBreakdown(input: SalaryInputs): SalaryBreakdown {
  const i = { ...DEFAULT_SALARY, ...input, variablePay: { ...DEFAULT_SALARY.variablePay, ...(input.variablePay ?? {}) } };
  const ctc = pos(i.ctc);
  const epf = EPF_RULES.value;
  const basic = ctc * Math.min(1, pos(i.basicShare));
  const pfWage = i.pfOnWageCeiling ? Math.min(basic, epf.wageCeiling * 12) : basic;
  const employerPf = pfWage * epf.employerRate;
  const employeePf = pfWage * epf.employeeRate;
  const eps = Math.min(pfWage, epf.epsWageCeiling * 12) * epf.epsRate;
  const employerNps = basic * pos(i.employerNpsShare);
  const gratuity = basic * GRATUITY.value.rate;
  const variableTarget = ctc * Math.min(1, pos(i.variablePay.targetShare));
  const variablePaid = variableTarget * pos(i.variablePay.expectedPayout);
  const fixedGross = Math.max(0, ctc - employerPf - employerNps - (i.gratuityInCtc ? gratuity : 0) - variableTarget);
  const gross = fixedGross + variablePaid;
  const professionalTax = gross > 0 ? PROFESSIONAL_TAX.value[i.state] ?? PROFESSIONAL_TAX.value.OTHER : 0;
  const ownNps = Math.min(pos(i.ownNpsYearly), fixedGross);
  const hra = Math.min(fixedGross, basic * pos(i.hraShareOfBasic));
  const hraEx = pos(i.hraExemption) > 0 ? pos(i.hraExemption) : hraExemption(hra, pos(i.rentMonthly) * 12, basic, i.cityIsMetro);
  const perquisiteExcess = Math.max(0, employerPf + employerNps - EMPLOYER_NPS.value.retirementPerquisiteCap);
  const old = OLD_REGIME.value;
  const interestDeduction = Math.min(old.homeLoanInterestLimit, pos(i.homeLoanInterest));

  /** Taxable income under each regime for a given variable payout. */
  const taxables = (variable: number) => {
    const salary = fixedGross + variable + employerNps + perquisiteExcess;
    const taxableNew = salary - NEW_REGIME.value.standardDeduction - Math.min(employerNps, EMPLOYER_NPS.value.newRegimeCap * basic);
    const taxableOld =
      salary -
      old.standardDeduction -
      (variable + fixedGross > 0 ? professionalTax : 0) -
      Math.min(old.sec80cLimit, employeePf + pos(i.other80C) + pos(i.homeLoanPrincipal)) -
      Math.min(employerNps, EMPLOYER_NPS.value.oldRegimeCap * basic) -
      Math.min(old.nps1bLimit, ownNps) -
      Math.min(old.sec80dLimit, pos(i.sec80D)) -
      Math.min(i.parentsSenior ? old.sec80dParentsSenior : old.sec80dParents, pos(i.sec80DParents)) -
      hraEx -
      interestDeduction;
    return { taxableNew, taxableOld };
  };

  const { taxableNew, taxableOld } = taxables(variablePaid);
  const taxNew = incomeTax(taxableNew, 'new');
  const taxOld = incomeTax(taxableOld, 'old');
  const regime: Regime = i.regime === 'auto' ? (taxOld < taxNew ? 'old' : 'new') : i.regime;
  const tax = regime === 'new' ? taxNew : taxOld;
  const taxable = regime === 'new' ? taxableNew : taxableOld;
  // Tax on fixed pay alone sets the monthly figure; the rest of the year's tax comes out of the variable payout.
  const fixedOnly = taxables(0);
  const taxFixed = incomeTax(regime === 'new' ? fixedOnly.taxableNew : fixedOnly.taxableOld, regime);
  const monthlyInHand = (fixedGross - employeePf - professionalTax - ownNps - taxFixed) / 12;
  const annualCash = gross - employeePf - professionalTax - ownNps - tax;
  return {
    ctc,
    basic,
    employerPf,
    employeePf,
    eps,
    epfCredit: employeePf + employerPf - eps,
    employerNps,
    ownNps,
    gratuity,
    variableTarget,
    variablePaid,
    fixedGross,
    gross,
    hra,
    hraExemption: hraEx,
    homeLoanInterestDeduction: interestDeduction,
    sec123Deduction: Math.min(old.sec80cLimit, employeePf + pos(i.other80C) + pos(i.homeLoanPrincipal)),
    perquisiteExcess,
    professionalTax,
    taxNew,
    taxOld,
    regime,
    tax,
    taxable,
    monthlyInHand,
    variableNet: annualCash - monthlyInHand * 12,
    annualCash,
    takeHome: annualCash,
    monthlyTakeHome: monthlyInHand,
  };
}

/** Taxable income behind a breakdown, for the marginal rate on slab-taxed investment gains. */
export function taxableIncome(b: SalaryBreakdown): number {
  return b.taxable;
}

/** Why one regime is cheaper this year, in a sentence. Reads only the breakdown. */
export function regimeReason(b: SalaryBreakdown, fmt: (n: number) => string): string {
  const diff = Math.abs(b.taxNew - b.taxOld);
  if (diff < 1) return 'Both regimes cost the same.';
  if (b.taxOld < b.taxNew) {
    const parts = [
      b.homeLoanInterestDeduction > 0 && `home-loan interest ${fmt(b.homeLoanInterestDeduction)}`,
      b.hraExemption > 0 && `HRA ${fmt(b.hraExemption)}`,
      b.sec123Deduction > 0 && `Sec 123 (old 80C) ${fmt(b.sec123Deduction)}`,
    ].filter(Boolean);
    return `Old regime saves ${fmt(diff)}: ${parts.length ? parts.join(' + ') : 'your deductions'} outweigh the new-regime slabs.`;
  }
  return b.taxNew === 0 ? 'New regime: income is within the ₹12 L rebate (Sec 156), so no tax.' : `New regime saves ${fmt(diff)}: its lower slabs beat your old-regime deductions.`;
}
