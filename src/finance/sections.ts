/**
 * Section numbers under the Income-tax Act, 2025 (in force from 1 April 2026) for every deduction and rule the
 * app names. The Act renumbered everything; people still know the old numbers, so labels show both.
 *
 * A mapping is `confirmed` only when the new section's text was seen on incometaxindia.gov.in. Unconfirmed
 * mappings show the old label alone, so the interface never states a number we could not check.
 * Checked 27 October 2026.
 */

export type OldSection = '80C' | '80CCD(1B)' | '80CCD(2)' | '80D' | '24(b)' | '10(13A)' | '87A' | '16(ia)' | '115BAC';

export interface SectionMapping {
  old: OldSection;
  /** Section in the Income-tax Act, 2025, when confirmed. */
  current: string | null;
  what: string;
  source: string;
  note?: string;
}

export const SECTIONS: Record<OldSection, SectionMapping> = {
  '80C': {
    old: '80C',
    current: '123',
    what: 'PF, PPF, ELSS, life cover, home-loan principal: up to ₹1.5 L (old regime)',
    source: 'https://www.incometaxindia.gov.in/w/schedule-xv-2',
    note: 'Qualifying payments are listed in Schedule XV, “see section 123”.',
  },
  '80CCD(1B)': {
    old: '80CCD(1B)',
    current: null,
    what: 'Your own NPS contribution: up to ₹50,000 more (old regime)',
    source: 'https://www.incometaxindia.gov.in/w/section-124-98',
    note: 'Secondary sources place all NPS deductions in section 124; we only saw the employer part on the official page.',
  },
  '80CCD(2)': {
    old: '80CCD(2)',
    current: '124',
    what: 'Employer’s NPS contribution: up to 14% of basic in the new regime, 10% in the old',
    source: 'https://www.incometaxindia.gov.in/w/section-124-98',
  },
  '80D': {
    old: '80D',
    current: '126',
    what: 'Health-insurance premiums: ₹25,000 for you, ₹25,000 or ₹50,000 for parents (old regime)',
    source: 'https://www.incometaxindia.gov.in/w/section-126-92',
  },
  '24(b)': {
    old: '24(b)',
    current: '22',
    what: 'Interest on a home loan for a self-occupied house: up to ₹2 L (old regime)',
    source: 'https://www.incometaxindia.gov.in/w/section-22-218',
    note: 'Some secondary tables give section 20; the official section 22 page carries the ₹2 L interest limit.',
  },
  '10(13A)': {
    old: '10(13A)',
    current: null,
    what: 'House rent allowance exemption (old regime)',
    source: 'https://www.incometaxindia.gov.in/w/deductions/allowances-allowed-to-a-salaried-employee',
    note: 'Exemptions moved to schedules under the new Act; the exact reference for HRA is not confirmed.',
  },
  '87A': {
    old: '87A',
    current: '156',
    what: 'Rebate: no tax on income up to ₹12 L in the new regime (₹5 L in the old)',
    source: 'https://www.incometaxindia.gov.in/w/section-156-84',
  },
  '16(ia)': {
    old: '16(ia)',
    current: '19',
    what: 'Standard deduction on salary: ₹75,000 new regime, ₹50,000 old',
    source: 'https://www.incometaxindia.gov.in/w/section-19-206',
  },
  '115BAC': {
    old: '115BAC',
    current: '202',
    what: 'The new (default) tax regime',
    source: 'https://www.incometaxindia.gov.in/w/section-156-84',
    note: 'Section 156 refers to income taxed under section 202(1), the new-regime rates.',
  },
};

/** "Sec 123 (old 80C)", or "Sec 10(13A)" when the new number is not confirmed. */
export function sectionLabel(old: OldSection): string {
  const m = SECTIONS[old];
  return m.current ? `Sec ${m.current} (old ${old})` : `Sec ${old}`;
}

/** Short form for tight spaces: "Sec 123", or the old label. */
export function sectionShort(old: OldSection): string {
  const m = SECTIONS[old];
  return m.current ? `Sec ${m.current}` : `Sec ${old}`;
}
