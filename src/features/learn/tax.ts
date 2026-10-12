/**
 * Tax AWARENESS assumptions — dated, editable and sourced. These are educational
 * reference values, not current law. Users are asked to verify them on the official sites.
 */
export interface TaxAssumptions {
  asOf: string; // what the values reflect
  equityStcgRate: number; // listed equity / equity MF held ≤ 12 months
  equityLtcgRate: number; // held > 12 months
  equityLtcgExemption: number; // annual exemption on LTCG, INR
  sec80cLimit: number; // old regime
  nps80ccd1b: number; // additional NPS deduction, old regime
  ppfRate: number; // notified quarterly by the Government
  epfRate: number; // declared annually by EPFO
  newRegimeZeroTaxIncome: number; // taxable income up to which the rebate leaves no tax
}

export const DEFAULT_TAX: TaxAssumptions = {
  asOf: 'FY 2025-26 rules, as announced up to the Union Budget of February 2025',
  equityStcgRate: 0.2,
  equityLtcgRate: 0.125,
  equityLtcgExemption: 125000,
  sec80cLimit: 150000,
  nps80ccd1b: 50000,
  ppfRate: 0.071,
  epfRate: 0.0825,
  newRegimeZeroTaxIncome: 1200000,
};

export const TAX_SOURCES = [
  { label: 'Income Tax Department — official portal', url: 'https://www.incometax.gov.in/' },
  { label: 'Union Budget documents', url: 'https://www.indiabudget.gov.in/' },
  { label: 'EPFO — Employees’ Provident Fund', url: 'https://www.epfindia.gov.in/' },
  { label: 'National Savings Institute — PPF & small savings', url: 'https://www.nsiindia.gov.in/' },
  { label: 'PFRDA — National Pension System', url: 'https://www.pfrda.org.in/' },
  { label: 'SEBI investor education', url: 'https://investor.sebi.gov.in/' },
];

/** Illustrative equity capital-gains tax. Ignores surcharge, cess, set-offs and grandfathering. */
export function equityGainsTax(gain: number, months: number, t: TaxAssumptions): { tax: number; rate: number; kind: 'STCG' | 'LTCG' } {
  if (gain <= 0) return { tax: 0, rate: 0, kind: months > 12 ? 'LTCG' : 'STCG' };
  if (months > 12) {
    const taxable = Math.max(0, gain - t.equityLtcgExemption);
    return { tax: taxable * t.equityLtcgRate, rate: t.equityLtcgRate, kind: 'LTCG' };
  }
  return { tax: gain * t.equityStcgRate, rate: t.equityStcgRate, kind: 'STCG' };
}
