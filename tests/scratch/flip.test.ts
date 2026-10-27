import { it } from 'vitest';
import { simulate } from '@/finance/simulate';
import { DEFAULT_ASSUMPTIONS, blankProfile } from '@/state/demo';
import { HOME_LOAN_RATE } from '@/finance/assumptions';

function person(ctc: number, rent: number, moveIn: boolean | null, extra = {}) {
  const p = blankProfile(2026);
  p.about.age = 28; p.about.city = 'mumbai';
  p.income = { ...p.income, mode: 'ctc', ctc, salaryGrowth: 0.06, salary: { other80C: 150000, sec80D: 25000, ownNpsYearly: 50000, sec80DParents: 50000, parentsSenior: true, ...extra } };
  p.cashflow.essential = [{ id: 'rent', label: 'Rent', amount: rent }, { id: 'g', label: 'Groceries', amount: 20000 }];
  p.position.cashSavings = 3_000_000;
  if (moveIn !== null) p.lifeEvents = [{ id: 'h', kind: 'homePurchase', label: 'Flat', year: 2030, oneTimeCost: 0, incomeChangePct: 0, monthlyExpenseChange: 0, breakMonths: 0, home: { propertyValue: 15_000_000, downPaymentPct: 0.2, loanRate: HOME_LOAN_RATE.value, tenureYears: 20, state: 'MH', moveIn } }];
  return p;
}
it('explore', () => {
  for (const ctc of [1_600_000, 1_800_000, 2_000_000, 2_500_000, 3_000_000]) for (const rent of [0, 30000, 45000]) for (const mv of [null, true, false] as const) {
    const r = simulate(person(ctc, rent, mv), DEFAULT_ASSUMPTIONS, { years: 10 });
    console.log(ctc, rent, mv, r.rows.map((x) => (x.regime === 'old' ? 'O' : 'n')).join(''), r.rows.slice(3,6).map(x=>x.tax && Math.round(x.tax.new - x.tax.old)).join(' '));
  }
});
