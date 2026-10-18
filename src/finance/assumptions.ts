/**
 * Every dated Indian rule or rate the engine relies on, in one place.
 * Each value carries the date it was checked (`asOf`) and the page it was checked against (`source`).
 * Values marked `approximate` could not be confirmed on an official page; the interface says so.
 *
 * Last full review: 18 October 2026.
 */

export interface Dated<T> {
  label: string;
  value: T;
  asOf: string;
  source: string;
  sourceLabel: string;
  note?: string;
  approximate?: boolean;
  /** One-line summary for tables, when the value is not a single number. */
  display?: string;
}

const d = <T>(x: Dated<T>) => x;

/* ---------- Prices and returns ---------- */

export const CPI_LATEST = d({
  label: 'CPI inflation, latest print',
  value: 0.0554,
  asOf: 'September 2026 (released 12 Oct 2026)',
  source: 'https://www.mospi.gov.in/',
  sourceLabel: 'MoSPI CPI press release, September 2026',
  note: 'All-India CPI (base 2024), provisional. August 2026 was 4.83%.',
});

export const PLANNING_INFLATION = d({
  label: 'Long-run planning inflation (default)',
  value: 0.06,
  asOf: 'Planning convention',
  source: 'https://www.rbi.org.in/',
  sourceLabel: 'RBI inflation target 4% ± 2%; 6% is the upper tolerance band',
  note: 'Editable. Set above the RBI target midpoint to stay cautious over 20 years.',
});

export const EDUCATION_INFLATION = d({
  label: 'Education cost inflation (default)',
  value: 0.09,
  asOf: 'Planning convention',
  source: 'https://www.mospi.gov.in/',
  sourceLabel: 'Planning range 8–10%; editable per goal',
});

export const EPF_RATE = d({
  label: 'EPF interest rate',
  value: 0.0825,
  asOf: 'FY 2025-26 (notified 1 Jul 2026)',
  source: 'https://www.epfindia.gov.in/',
  sourceLabel: 'EPFO circular, July 2026',
  note: 'Unchanged for a second year.',
});

export const SMALL_SAVINGS = {
  ppf: d({ label: 'PPF', value: 0.071, asOf: 'Oct–Dec 2026', source: 'https://www.nsiindia.gov.in/', sourceLabel: 'Ministry of Finance notification, 30 Sep 2026' }),
  nsc: d({ label: 'NSC', value: 0.077, asOf: 'Oct–Dec 2026', source: 'https://www.nsiindia.gov.in/', sourceLabel: 'Ministry of Finance notification, 30 Sep 2026' }),
  ssy: d({ label: 'Sukanya Samriddhi', value: 0.082, asOf: 'Oct–Dec 2026', source: 'https://www.nsiindia.gov.in/', sourceLabel: 'Ministry of Finance notification, 30 Sep 2026' }),
  scss: d({ label: 'Senior Citizens Savings Scheme', value: 0.082, asOf: 'Oct–Dec 2026', source: 'https://www.nsiindia.gov.in/', sourceLabel: 'Ministry of Finance notification, 30 Sep 2026' }),
  poSavings: d({ label: 'Post office savings account', value: 0.04, asOf: 'Oct–Dec 2026', source: 'https://www.nsiindia.gov.in/', sourceLabel: 'Ministry of Finance notification, 30 Sep 2026' }),
};

export const HOME_LOAN_RATE = d({
  label: 'Home-loan rate (planning default)',
  value: 0.08,
  asOf: '15 Oct 2026',
  source: 'https://sbi.bank.in/web/interest-rates/interest-rates/loan-schemes-interest-rates/home-loans-interest-rates-current',
  sourceLabel: 'SBI home loans from 7.50% p.a., w.e.f. 15 Oct 2026',
  note: 'SBI regular home loans run 7.50–8.80% by credit score after the October 2026 repo hike. The default uses 8.0%.',
});

/* ---------- Income tax, tax year 2026-27 ---------- */

export interface Slab {
  upTo: number; // upper bound of taxable income for this rate; Infinity for the top slab
  rate: number;
}

export const TAX_LAW = d({
  label: 'Income-tax law',
  value: 'Income-tax Act, 2025',
  asOf: 'Tax year 2026-27',
  source: 'https://www.incometax.gov.in/',
  sourceLabel: 'Income-tax Act, 2025, in force from 1 April 2026',
  note: 'Budget 2026 left slabs unchanged. Share buybacks are now taxed as capital gains. Section 87A is now section 202.',
});

export const NEW_REGIME = d({
  label: 'New regime slabs',
  display: 'Nil to ₹4 L, then 5% per ₹4 L band to 30% above ₹24 L; ₹75,000 standard deduction; rebate up to ₹60,000 on income to ₹12 L',
  value: {
    slabs: [
      { upTo: 400000, rate: 0 },
      { upTo: 800000, rate: 0.05 },
      { upTo: 1200000, rate: 0.1 },
      { upTo: 1600000, rate: 0.15 },
      { upTo: 2000000, rate: 0.2 },
      { upTo: 2400000, rate: 0.25 },
      { upTo: Infinity, rate: 0.3 },
    ] as Slab[],
    standardDeduction: 75000,
    rebateLimit: 1200000, // taxable income up to which the rebate applies
    rebateMax: 60000,
    surchargeCap: 0.25,
  },
  asOf: 'Tax year 2026-27',
  source: 'https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1',
  sourceLabel: 'Income Tax Department, tax rates for individuals',
  note: '₹75,000 standard deduction and the ₹60,000 rebate mean salary up to about ₹12.75 lakh pays no tax.',
});

export const OLD_REGIME = d({
  label: 'Old regime slabs',
  display: 'Nil to ₹2.5 L, 5% to ₹5 L, 20% to ₹10 L, 30% above; ₹50,000 standard deduction; 80C ₹1.5 L, 80D ₹25,000',
  value: {
    slabs: [
      { upTo: 250000, rate: 0 },
      { upTo: 500000, rate: 0.05 },
      { upTo: 1000000, rate: 0.2 },
      { upTo: Infinity, rate: 0.3 },
    ] as Slab[],
    standardDeduction: 50000,
    rebateLimit: 500000,
    rebateMax: 12500,
    sec80cLimit: 150000,
    sec80dLimit: 25000, // self and family, below 60
    surchargeCap: 0.37,
  },
  asOf: 'Tax year 2026-27',
  source: 'https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1',
  sourceLabel: 'Income Tax Department, tax rates for individuals',
});

export const SURCHARGE = d({
  label: 'Surcharge',
  display: '10% above ₹50 L, 15% above ₹1 Cr, 25% above ₹2 Cr (37% above ₹5 Cr, old regime only)',
  value: [
    { above: 5000000, rate: 0.1 },
    { above: 10000000, rate: 0.15 },
    { above: 20000000, rate: 0.25 },
    { above: 50000000, rate: 0.37 },
  ],
  asOf: 'Tax year 2026-27',
  source: 'https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1',
  sourceLabel: 'Income Tax Department, tax rates for individuals',
  note: 'Capped at 25% in the new regime.',
});

export const CESS = d({ label: 'Health and education cess', value: 0.04, asOf: 'Tax year 2026-27', source: 'https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1', sourceLabel: 'Income Tax Department' });

export const CAPITAL_GAINS = d({
  label: 'Capital gains',
  display: 'Equity: 20% short-term, 12.5% long-term above ₹1.25 L a year. Gold and international funds: 12.5% after 24 months. Debt funds: slab rate',
  value: {
    equityStcg: 0.2, // listed equity and equity funds held ≤ 12 months
    equityLtcg: 0.125, // held > 12 months
    equityLtcgExemption: 125000, // per year
    otherLtcg: 0.125, // gold, international funds, other non-debt assets held > 24 months
  },
  asOf: 'Tax year 2026-27 (rates from 23 Jul 2024)',
  source: 'https://www.indiabudget.gov.in/',
  sourceLabel: 'Union Budget 2024-25; unchanged in Budgets 2025 and 2026',
  note: 'Debt funds bought on or after 1 April 2023 are taxed at your slab rate, whatever the holding period.',
});

/* ---------- Salary ---------- */

export const EPF_RULES = d({
  label: 'EPF contributions',
  display: '12% of basic from you and your employer; 8.33% of up to ₹15,000 a month goes to EPS; locked until 58',
  value: { employeeRate: 0.12, employerRate: 0.12, epsRate: 0.0833, wageCeiling: 15000, lockUntilAge: 58 },
  asOf: '2026',
  source: 'https://www.epfindia.gov.in/',
  sourceLabel: 'EPFO: 12% of basic each; 8.33% of up to ₹15,000 a month goes to the pension scheme (EPS)',
});

export type StateCode = 'MH' | 'KA' | 'TS' | 'TN' | 'WB' | 'GJ' | 'DL' | 'HR' | 'UP' | 'OTHER';

export const STATE_NAMES: Record<StateCode, string> = {
  MH: 'Maharashtra',
  KA: 'Karnataka',
  TS: 'Telangana',
  TN: 'Tamil Nadu',
  WB: 'West Bengal',
  GJ: 'Gujarat',
  DL: 'Delhi',
  HR: 'Haryana',
  UP: 'Uttar Pradesh',
  OTHER: 'Other state',
};

export const PROFESSIONAL_TAX = d({
  label: 'Professional tax (annual, top slab)',
  display: 'Maharashtra, Karnataka, Tamil Nadu ₹2,500; Telangana, West Bengal, Gujarat ₹2,400; Delhi, Haryana, UP nil',
  value: { MH: 2500, KA: 2500, TS: 2400, TN: 2500, WB: 2400, GJ: 2400, DL: 0, HR: 0, UP: 0, OTHER: 2500 } as Record<StateCode, number>,
  asOf: 'FY 2026-27',
  source: 'https://hrone.cloud/blog/professional-tax-slab-rates-2026-27/',
  sourceLabel: 'State notifications, cross-checked against HROne’s 2026-27 table',
  note: 'Maharashtra ₹2,500 is consistent across sources. Karnataka, Tamil Nadu and West Bengal figures differ between sources by up to ₹100.',
  approximate: true,
});

/* ---------- Buying a home ---------- */

export interface PropertyCharges {
  stampDuty: number; // share of property value, incl. cesses
  registration: number; // share of value
  registrationCap: number; // INR; Infinity if none
}

export const PROPERTY_CHARGES = d({
  label: 'Stamp duty and registration',
  display: 'Maharashtra 7% + 1% registration (max ₹30,000); Karnataka ≈ 5.6% + 2%; Telangana ≈ 5.5% + 0.5%',
  value: {
    MH: { stampDuty: 0.07, registration: 0.01, registrationCap: 30000 },
    KA: { stampDuty: 0.056, registration: 0.02, registrationCap: Infinity },
    TS: { stampDuty: 0.055, registration: 0.005, registrationCap: Infinity },
    OTHER: { stampDuty: 0.06, registration: 0.01, registrationCap: Infinity },
  } as Partial<Record<StateCode, PropertyCharges>> & { OTHER: PropertyCharges },
  asOf: 'October 2026',
  source: 'https://igrmaharashtra.gov.in/',
  sourceLabel: 'IGR Maharashtra (urban: 5% duty + 1% metro cess + 1% LBT; registration 1% up to ₹30,000)',
  note: 'Maharashtra urban rates for a male buyer are consistent across sources (women get 1% off). Karnataka (5% duty plus cess and surcharge, 2% registration) and Telangana (4% duty, 1.5% transfer duty, 0.5% registration) are approximate because sources differ. Other states use a 6% + 1% placeholder you can edit per purchase.',
  approximate: true,
});

export function propertyCharges(state: StateCode): PropertyCharges {
  return PROPERTY_CHARGES.value[state] ?? PROPERTY_CHARGES.value.OTHER;
}

export const UNDER_CONSTRUCTION_GST = d({
  label: 'GST on under-construction homes',
  value: 0.05,
  asOf: '2026',
  source: 'https://cbic-gst.gov.in/',
  sourceLabel: 'CBIC GST rates for residential construction (non-affordable)',
  note: 'Ready-to-move homes with a completion certificate carry no GST.',
});

export const HOME_DEFAULTS = {
  interiors: 500000, // today's INR
  maintenancePerSqft: 4, // INR per sq ft per month (₹3–5 in metros)
  propertyTaxShare: 0.001, // of property value per year, illustrative
  foir: 0.5, // lenders become cautious when all EMIs exceed half of take-home
};

/* ---------- Protection ---------- */

export type CityTier = 1 | 2 | 3;

export const HEALTH_COVER_BENCHMARK = d({
  label: 'Health cover benchmark (one person)',
  display: 'Metro ₹10 L, tier-2 ₹7.5 L, elsewhere ₹5 L',
  value: { 1: 1000000, 2: 750000, 3: 500000 } as Record<CityTier, number>,
  asOf: 'Planning convention, 2026',
  source: 'https://irdai.gov.in/',
  sourceLabel: 'Planning convention; compare policies on IRDAI-registered insurers',
  note: 'Family floaters: ×1.5 for 2–3 people, ×2 for 4 or more. A ₹25–50 lakh super top-up is a low-cost way to cover large bills.',
});

export const TERM_COVER_MULTIPLE = d({
  label: 'Term cover benchmark',
  display: '10–15× annual income',
  value: { min: 10, max: 15 },
  asOf: 'Planning convention',
  source: 'https://irdai.gov.in/',
  sourceLabel: 'Planning convention: 10–15× annual income when someone depends on you',
});

/* ---------- Financial independence ---------- */

export const WITHDRAWAL_RATE = d({
  label: 'Safe withdrawal rate (default)',
  value: 0.035,
  asOf: 'Planning convention',
  source: 'https://www.investopedia.com/terms/f/four-percent-rule.asp',
  sourceLabel: 'US “4% rule”, lowered for India',
  note: 'India uses 3–3.5% rather than 4%: inflation is higher and a few bad market years early in retirement (sequence risk) do more damage.',
});

export const HEALTHCARE_INFLATION = d({
  label: 'Healthcare inflation after FI',
  value: 0.1,
  asOf: 'Planning convention',
  source: 'https://irdai.gov.in/',
  sourceLabel: 'Planning convention; medical costs in India have risen faster than CPI',
});

/** Every dated value, for the Settings page. */
export const ALL_DATED: Dated<unknown>[] = [
  CPI_LATEST,
  PLANNING_INFLATION,
  EDUCATION_INFLATION,
  EPF_RATE,
  ...Object.values(SMALL_SAVINGS),
  HOME_LOAN_RATE,
  TAX_LAW,
  NEW_REGIME,
  OLD_REGIME,
  SURCHARGE,
  CESS,
  CAPITAL_GAINS,
  EPF_RULES,
  PROFESSIONAL_TAX,
  PROPERTY_CHARGES,
  UNDER_CONSTRUCTION_GST,
  HEALTH_COVER_BENCHMARK,
  TERM_COVER_MULTIPLE,
  WITHDRAWAL_RATE,
  HEALTHCARE_INFLATION,
];
