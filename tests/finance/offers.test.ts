import { describe, expect, it } from 'vitest';
import { decodeOffer, newOffer, offerFromProfile, offersCsv, otherSpending, profileWithOffer } from '@/finance/offers';
import { regimeSwitches, regimeTimeline } from '@/finance/regimeTimeline';
import { outcomeRanges, bandByYear } from '@/finance/ranges';
import { formatCompact } from '@/finance/money';
import { simulate } from '@/finance/simulate';
import { DEFAULT_ASSUMPTIONS, demoProfile } from '@/state/demo';

const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.max(tol, Math.abs(b) * tol));
const G = 15 / 26 / 12; // gratuity per rupee of basic

describe('offer decoder: three worked examples (hand-checked)', () => {
  it('metro: ₹18 L in Bengaluru, basic 50%, rent ₹30,000, no variable', () => {
    const r = decodeOffer(newOffer('m', 'Metro', { city: 'bengaluru', ctc: 1_800_000, rentMonthly: 30_000, healthCover: 1_000_000 }), 25_000);
    // Basic ₹9 L; PF ₹1,08,000 each side; gratuity ₹43,269.23; fixed pay ₹16,48,730.77.
    const fixed = 1_800_000 - 108_000 - 900_000 * G;
    close(r.b.fixedGross, fixed);
    // New regime on ₹15,73,730.77: ₹20,000 + ₹40,000 + 15% × ₹3,73,730.77 = ₹1,16,059.62, plus 4% cess = ₹1,20,702.
    const tax = (20_000 + 40_000 + 0.15 * (fixed - 75_000 - 1_200_000)) * 1.04;
    expect(r.b.regime).toBe('new');
    close(r.b.tax, tax);
    // In-hand: (fixed − your PF ₹1,08,000 − PT ₹2,500 − tax) / 12 = ₹1,18,127.40.
    close(r.monthlyInHand, (fixed - 108_000 - 2_500 - tax) / 12);
    close(r.monthlyInHand, 118_127.4, 1e-6);
    close(r.leftAfterRentAndSpending, r.monthlyInHand - 30_000 - 25_000);
    expect(r.flags.map((f) => f.kind)).toEqual(['gratuity']);
  });

  it('non-metro: ₹8 L elsewhere, basic 40%, PF on the ₹25,000 ceiling', () => {
    const r = decodeOffer(newOffer('n', 'Non-metro', { city: 'other', ctc: 800_000, basicShare: 0.4, pfOnWageCeiling: true, rentMonthly: 9_000 }), 15_000);
    // Basic ₹3,20,000; PF on ₹3,00,000 = ₹36,000 each side; gratuity ₹15,384.62; fixed pay ₹7,48,615.38; no tax.
    const fixed = 800_000 - 36_000 - 320_000 * G;
    close(r.b.fixedGross, fixed);
    expect(r.b.tax).toBe(0);
    // In-hand: (₹7,48,615.38 − ₹36,000 − PT ₹2,500) / 12 = ₹59,176.28.
    close(r.monthlyInHand, (fixed - 36_000 - 2_500) / 12);
    close(r.monthlyInHand, 59_176.28, 1e-6);
    expect(r.flags.map((f) => f.kind)).toEqual(expect.arrayContaining(['basic', 'pf-cap', 'gratuity']));
    expect(r.askHr.some((h) => h.key === 'pf')).toBe(true);
  });

  it('heavy variable: ₹30 L in Mumbai with 30% variable at 80% payout', () => {
    const r = decodeOffer(newOffer('v', 'Variable', { city: 'mumbai', ctc: 3_000_000, variable: { targetShare: 0.3, expectedPayout: 0.8 }, joiningBonus: 200_000, clawbackMonths: 12 }), 30_000);
    // Basic ₹15 L; PF ₹1,80,000 each side; gratuity ₹72,115.38; variable target ₹9 L, paid ₹7,20,000.
    const fixed = 3_000_000 - 180_000 - 1_500_000 * G - 900_000;
    close(r.b.fixedGross, fixed);
    close(r.b.variablePaid, 720_000);
    // Monthly in-hand carries only the tax on fixed pay: ₹20,000 + ₹40,000 + ₹60,000 + 20% × (₹17,72,884.62 − ₹16 L),
    // plus cess = ₹1,60,760; in-hand (fixed − ₹1,80,000 − ₹2,500 − ₹1,60,760) / 12 = ₹1,25,385.38.
    const taxFixed = (120_000 + 0.2 * (fixed - 75_000 - 1_600_000)) * 1.04;
    close(r.monthlyInHand, (fixed - 180_000 - 2_500 - taxFixed) / 12);
    close(r.monthlyInHand, 125_385.38, 1e-6);
    // The variable month carries the rest of the year's tax.
    close(r.bonusMonthCash, r.monthlyInHand + r.b.variableNet);
    expect(r.flags.map((f) => f.kind)).toEqual(expect.arrayContaining(['variable', 'clawback']));
    // Joining bonus taxed at the marginal rate (30% + cess).
    close(r.joiningBonusNet, 200_000 * (1 - 0.312), 1e-3);
  });

  it('ESOPs are information only, never cash', () => {
    const a = decodeOffer(newOffer('e', 'E', { esopYearly: 500_000 }), 0);
    const b = decodeOffer(newOffer('e', 'E'), 0);
    expect(a.year1Cash).toBe(b.year1Cash);
    expect(a.flags.find((f) => f.kind === 'esop')!.text).toMatch(/illiquid and uncertain/);
  });
});

describe('offers in the plan', () => {
  const p = demoProfile(2026);
  it('the current job reads back from the plan exactly', () => {
    const current = offerFromProfile(p)!;
    const same = profileWithOffer(p, current);
    expect(simulate(same, DEFAULT_ASSUMPTIONS).points.at(-1)!.netWorth).toBeCloseTo(simulate(p, DEFAULT_ASSUMPTIONS).points.at(-1)!.netWorth, 0);
  });
  it('a better-paid offer raises the end-of-plan net worth; rent and city move with it', () => {
    const o = newOffer('a', 'Offer A', { city: 'bengaluru', ctc: 1_500_000, rentMonthly: 22_000, variable: { targetShare: 0.1, expectedPayout: 0.8 } });
    const q = profileWithOffer(p, o);
    expect(q.about.city).toBe('bengaluru');
    expect(q.income.salary?.state).toBe('KA');
    expect(q.cashflow.essential.find((l) => l.id === 'rent')!.amount).toBe(22_000);
    expect(simulate(q, DEFAULT_ASSUMPTIONS).points.at(-1)!.netWorthReal).toBeGreaterThan(simulate(p, DEFAULT_ASSUMPTIONS).points.at(-1)!.netWorthReal);
    // Essentials other than rent ₹19,000 + lifestyle ₹8,800.
    expect(otherSpending(p)).toBe(27_800);
  });
  it('the CSV has one column per offer and quotes text with commas', () => {
    const rs = [decodeOffer(offerFromProfile(p)!, 0), decodeOffer(newOffer('a', 'Acme, Inc.'), 0)];
    const csv = offersCsv(rs, [1_000_000, null]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Measure,Current job,"Acme, Inc."');
    expect(lines.find((l) => l.startsWith('Monthly in-hand'))!.split(',')).toHaveLength(3);
  });
});

describe('regime timeline', () => {
  it('has one entry per salaried year, with both taxes and a reason', () => {
    const sim = simulate(demoProfile(2026), DEFAULT_ASSUMPTIONS);
    const t = regimeTimeline(sim, formatCompact);
    expect(t.length).toBe(sim.rows.filter((r) => r.regime).length);
    for (const y of t) {
      expect(y.reason.length).toBeGreaterThan(10);
      expect(y.regime === 'new' ? y.taxNew <= y.taxOld : y.taxOld < y.taxNew).toBe(true);
    }
    expect(regimeSwitches(t)[0].from).toBe(2026);
  });
});

describe('outcome ranges', () => {
  it('are seeded, ordered, and the band matches the horizon', () => {
    const p = demoProfile(2026);
    const a = outcomeRanges(p, DEFAULT_ASSUMPTIONS, 150);
    const b = outcomeRanges(p, DEFAULT_ASSUMPTIONS, 150);
    expect(a).toEqual(b);
    expect(a.netWorthReal.p10).toBeLessThan(a.netWorthReal.p50);
    expect(a.netWorthReal.p50).toBeLessThan(a.netWorthReal.p90);
    expect(a.band).toHaveLength(20);
    expect(a.fiByTarget).toBeGreaterThan(0);
    const real = bandByYear(a, true, 2026, DEFAULT_ASSUMPTIONS.inflation).get(2046)!;
    close(real.p90, a.netWorthReal.p90);
  });
});
