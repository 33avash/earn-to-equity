import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Pencil, Plus, Trash2 } from 'lucide-react';
import type { FinancialProfile, Goal, GoalCategory, RiskProfile } from '@/types/profile';
import { ASSET_CLASSES } from '@/types/profile';
import { useStore } from '@/state/store';
import { useExploreDemo } from '@/state/useDemo';
import { blankProfile } from '@/state/demo';
import { Wordmark } from '@/components/layout/Wordmark';
import { Atmosphere } from '@/components/motion/Motion';
import { Button, Field, MoneyInput, NumberInput, PercentInput, Select, Slider, TextInput, Toggle, Disclaimer, Notice, Badge, toast, AccentTitle } from '@/components/ui';
import { sectionLabel } from '@/finance/sections';
import { LineItemsEditor } from '@/features/editors/LineItems';
import { SalaryEditor } from '@/features/editors/SalaryEditor';
import { LoansEditor } from '@/features/editors/Loans';
import { AllocationEditor } from '@/features/editors/Allocation';
import { GOAL_CATEGORIES, GoalForm, PRIORITY_LABEL, newGoal } from '@/features/editors/GoalForm';
import { monthlyCashflow } from '@/finance/cashflow';
import { balanceSheet } from '@/finance/networth';
import { emergencyPlan } from '@/finance/emergency';
import { ASSET_LABELS, PRESETS, isValidAllocation } from '@/finance/portfolio';
import { AGE_MAX, AGE_MIN, ageError, fiAgeBounds, fiAgeError, validateProfile } from '@/finance/validate';
import { familySupportMonthly, hasDependents } from '@/finance/household';
import { formatINR, formatPct } from '@/finance/money';
import { useMoney } from '@/state/selectors';

const STEPS = [
  { title: 'About you', why: 'Your age and the age you’d like work to become optional set the length of your plan.' },
  { title: 'Income & career', why: 'Your CTC sets your take-home, tax and EPF. Expected raises shape the next 20 years.' },
  { title: 'Monthly cash flow', why: 'What you spend, what you repay, and what you move to savings. Transfers are kept separate from expenses.' },
  { title: 'Current position', why: 'What you own and owe today. This becomes your starting net worth.' },
  { title: 'Protection', why: 'An emergency reserve and insurance keep a setback from undoing your plan.' },
  { title: 'Financial goals', why: 'What you are working towards, in today’s prices. We’ll inflate costs to their target year.' },
  { title: 'Investment preferences', why: 'How your investments are split determines the return the projections assume.' },
  { title: 'Review', why: 'Check your answers before your plan is built. You can change any of them later.' },
];

type StepErrors = Record<string, string | null>;

/** Inline errors for each step. You cannot move forward while any of these is set. */
function stepErrors(step: number, p: FinancialProfile): StepErrors {
  switch (step) {
    case 0: {
      const age = ageError(p.about.age);
      return {
        age,
        fiAge: age ? null : fiAgeError(p.about.fiAge, p.about.age),
        dependents: !Number.isInteger(p.about.dependents) || p.about.dependents < 0 || p.about.dependents > 15 ? 'Enter a whole number from 0 to 15.' : null,
      };
    }
    case 1:
      return {
        income:
          (p.income.mode === 'ctc' ? (p.income.ctc ?? 0) <= 0 : p.income.monthlyTakeHome <= 0) && p.income.otherMonthlyIncome <= 0
            ? p.income.mode === 'ctc'
              ? 'Enter your annual CTC, or switch to monthly take-home.'
              : 'Enter your monthly take-home pay (or other income) so the plan has something to project.'
            : null,
        growth: p.income.salaryGrowth < -0.2 || p.income.salaryGrowth > 0.5 ? 'Use a growth rate between −20% and 50%.' : null,
      };
    case 2:
      return {
        items: [...p.cashflow.essential, ...p.cashflow.lifestyle].some((l) => l.amount > 0 && !l.label.trim()) ? 'Name every expense that has an amount.' : null,
        loans: p.liabilities.some((l) => !l.label.trim()) ? 'Name every loan.' : null,
        parents: familySupportMonthly(p) > 0 && p.about.dependents === 0 && p.about.parentsAsDependents === undefined ? 'Answer the question about your parents to continue.' : null,
      };
    case 3: {
      const badRate = p.liabilities.find((l) => l.balance > 0 && (l.rate < 0 || l.rate > 0.6));
      const noEmi = p.liabilities.find((l) => l.balance > 0 && l.emi <= 0);
      return {
        loans: badRate
          ? `“${badRate.label}” needs an interest rate between 0% and 60%.`
          : noEmi
            ? `“${noEmi.label}” has a balance but no monthly payment. Add the payment in the previous step.`
            : null,
      };
    }
    case 6:
      return { alloc: !isValidAllocation(p.preferences.targetAllocation) ? 'Your target allocation must add up to exactly 100%.' : null };
    default:
      return {};
  }
}

export default function Onboarding() {
  const navigate = useNavigate();
  const exploreDemo = useExploreDemo();
  const stored = useStore((s) => s.onboarding);
  const saveDraft = useStore((s) => s.saveDraft);
  const complete = useStore((s) => s.completeOnboarding);
  const isDemo = useStore((s) => s.isDemo);
  const hasPlan = useStore((s) => s.hasPlan);
  const profile = useStore((s) => s.profile);
  const [p, setP] = useState<FinancialProfile>(() => stored.draft ?? (hasPlan && !isDemo ? structuredClone(profile) : blankProfile()));
  const [params] = useSearchParams();
  // ?step=N jumps to a step (from Overview's accuracy checklist).
  const jump = Number(params.get('step'));
  const [step, setStep] = useState(Number.isInteger(jump) && jump > 0 && jump < STEPS.length ? jump : stored.draft ? stored.step : 0);
  const [tried, setTried] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    document.getElementById('step-title')?.focus();
  }, [step]);

  const update = (fn: (d: FinancialProfile) => void) =>
    setP((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });

  const errs = stepErrors(step, p);
  const hasErr = Object.values(errs).some(Boolean);

  const go = (to: number) => {
    if (to > step) {
      setTried(true);
      if (hasErr) return;
    }
    setTried(false);
    setStep(to);
    saveDraft(p, to);
    window.scrollTo(0, 0);
  };

  const generate = () => {
    const issues = validateProfile(p, useStore.getState().assumptions).filter((i) => i.severity === 'error');
    if (issues.length) {
      toast('Fix the highlighted issues before generating your plan.');
      return;
    }
    setGenerating(true);
    setTimeout(() => {
      complete({ ...p, quickStart: false, preferences: { ...p.preferences, horizonYears: 20 } });
      toast('Your wealth plan is ready.');
      navigate('/app');
    }, 450);
  };

  const progress = (step + 1) / STEPS.length;

  return (
    <div className="relative isolate min-h-[100dvh]">
      <Atmosphere />
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="glass relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 overflow-hidden !rounded-full pl-4 pr-2">
          <span className="sm:hidden">
            <Wordmark compact />
          </span>
          <span className="hidden sm:block">
            <Wordmark />
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => exploreDemo('/app')}>
              Use demo data
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                saveDraft(p, step);
                toast('Progress saved in this browser.');
                navigate(hasPlan ? '/app' : '/');
              }}
            >
              Save & exit
            </Button>
          </div>
          <div className="absolute inset-x-6 bottom-0 h-[2px] overflow-hidden rounded-full bg-line/70" role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
            <div className="h-full w-full origin-left rounded-full bg-forest transition-transform duration-700 ease-spring" style={{ transform: `scaleX(${progress})` }} />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-24 pt-12 sm:px-6 lg:grid-cols-12 lg:pt-20">
        <nav aria-label="Setup steps" className="hidden lg:col-span-3 lg:block">
          <ol className="sticky top-32 space-y-1">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <button
                  type="button"
                  onClick={() => (i < step ? go(i) : undefined)}
                  disabled={i > step}
                  aria-current={i === step ? 'step' : undefined}
                  className={`tap flex w-full items-center gap-3 rounded-full px-2 py-2 text-left text-[13.5px] transition-[background-color,color,box-shadow] duration-500 ${i === step ? 'bg-surface font-semibold text-evergreen shadow-[0_0_0_1px_var(--shell-line)]' : i < step ? 'text-charcoal hover:bg-mint/60' : 'text-grey/70'}`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] num ${i < step ? 'border-forest bg-forest text-onbrand' : i === step ? 'border-evergreen text-evergreen' : 'border-line'}`}>
                    {i < step ? <Check size={12} /> : i + 1}
                  </span>
                  {s.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <main className="lg:col-span-9">
          <p className="num text-[13px] text-grey">
            Detailed setup · step {step + 1} of {STEPS.length}
          </p>
          <h1 id="step-title" tabIndex={-1} className="display mt-3 text-[40px] leading-[1] outline-none sm:text-[56px]">
            <AccentTitle text={STEPS[step].title} />
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-grey">{STEPS[step].why}</p>

          <div className="mt-14">
            {step === 0 && <StepAbout p={p} update={update} errs={errs} />}
            {step === 1 && <StepIncome p={p} update={update} errs={tried ? errs : {}} />}
            {step === 2 && <StepCashflow p={p} update={update} errs={tried ? errs : {}} />}
            {step === 3 && <StepPosition p={p} update={update} errs={tried ? errs : {}} />}
            {step === 4 && <StepProtection p={p} update={update} />}
            {step === 5 && <StepGoals p={p} update={update} />}
            {step === 6 && <StepPreferences p={p} update={update} errs={tried ? errs : {}} />}
            {step === 7 && <StepReview p={p} goTo={go} />}
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-8">
            <Button variant="secondary" onClick={() => go(step - 1)} disabled={step === 0} icon={<ArrowLeft size={16} />}>
              Back
            </Button>
            <div className="flex items-center gap-3">
              {step >= 4 && step < 7 && (
                <button type="button" className="hit text-sm text-grey underline-offset-4 hover:text-evergreen hover:underline" onClick={() => go(step + 1)}>
                  Skip for now
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <Button onClick={() => go(step + 1)}>
                  Continue <ArrowRight size={16} aria-hidden />
                </Button>
              ) : (
                <Button onClick={generate} disabled={generating}>
                  {generating ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-onbrand/40 border-t-onbrand" /> Building your plan…
                    </>
                  ) : (
                    <>
                      Generate my plan <ArrowRight size={16} aria-hidden />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          {tried && hasErr && (
            <p role="alert" className="mt-3 text-right text-sm text-danger">
              Fix the fields marked in red to continue.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}

type StepProps = { p: FinancialProfile; update: (fn: (d: FinancialProfile) => void) => void; errs?: StepErrors };

function StepAbout({ p, update, errs = {} }: StepProps) {
  return (
    <div className="grid max-w-2xl gap-6 sm:grid-cols-2">
      <Field label="First name" optional hint="Only used to greet you. Never leaves this browser.">
        {(id, d) => <TextInput id={id} aria-describedby={d} value={p.about.name} maxLength={40} autoComplete="given-name" onChange={(e) => update((x) => void (x.about.name = e.target.value))} />}
      </Field>
      <Field label="Age" hint={`Your age on 1 January, ${AGE_MIN} to ${AGE_MAX}.`} error={errs.age}>
        {(id, d, invalid) => <NumberInput native id={id} describedBy={d} invalid={invalid} value={p.about.age} min={AGE_MIN} max={AGE_MAX} onChange={(v) => update((x) => void (x.about.age = v))} />}
      </Field>
      <Field label="Employment status">
        {(id) => (
          <Select id={id} value={p.about.employment} onChange={(e) => update((x) => void (x.about.employment = e.target.value as FinancialProfile['about']['employment']))}>
            <option value="salaried">Salaried</option>
            <option value="self-employed">Self-employed / freelance</option>
            <option value="student">Student</option>
            <option value="between-jobs">Between jobs</option>
            <option value="other">Other</option>
          </Select>
        )}
      </Field>
      <Field
        label="Target age for financial independence"
        help="The age at which you’d like work to be optional. It sets your FI target year. It is not a fixed retirement date."
        hint={ageError(p.about.age) ? undefined : `${fiAgeBounds(p.about.age).min} to ${fiAgeBounds(p.about.age).max}.`}
        error={errs.fiAge}
      >
        {(id, d, invalid) => <NumberInput native id={id} describedBy={d} invalid={invalid} value={p.about.fiAge} min={fiAgeBounds(p.about.age).min} max={fiAgeBounds(p.about.age).max} onChange={(v) => update((x) => void (x.about.fiAge = v))} />}
      </Field>
      <Field label="Financial dependents" optional hint="People who rely on your income, such as parents, a partner or children." error={errs.dependents}>
        {(id, d, invalid) => <NumberInput native id={id} describedBy={d} invalid={invalid} value={p.about.dependents} min={0} max={15} onChange={(v) => update((x) => void (x.about.dependents = v))} />}
      </Field>
    </div>
  );
}

function StepIncome({ p, update, errs = {} }: StepProps) {
  return (
    <div className="grid max-w-2xl gap-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <SalaryEditor p={p} update={update} error={errs.income} />
      </div>
      <Field label="Expected annual salary growth" help="Average yearly increase including raises and promotions. 6–10% is common early in a career, but it varies widely." error={errs.growth}>
        {(id, d, invalid) => <PercentInput id={id} describedBy={d} invalid={invalid} value={p.income.salaryGrowth} min={-20} max={50} onChange={(v) => update((x) => void (x.income.salaryGrowth = v))} />}
      </Field>
      <Field label="Other monthly income" optional hint="Freelance, rent received or interest. Assumed to rise with inflation.">
        {(id, d) => <MoneyInput id={id} describedBy={d} value={p.income.otherMonthlyIncome} max={1e8} onChange={(v) => update((x) => void (x.income.otherMonthlyIncome = v))} />}
      </Field>
      <Field label="Potential career changes" optional hint="Notes only. Model specific changes (a promotion, a break) as Life Events later." className="sm:col-span-2">
        {(id, d) => (
          <textarea id={id} aria-describedby={d} rows={3} maxLength={300} className="input h-auto py-2" value={p.income.careerNotes} onChange={(e) => update((x) => void (x.income.careerNotes = e.target.value))} placeholder="e.g. Considering a master’s degree in 2028" />
        )}
      </Field>
    </div>
  );
}

function ParentsQuestion({ p, update, error }: StepProps & { error?: string | null }) {
  const money = useMoney();
  const support = familySupportMonthly(p);
  if (support <= 0 || p.about.dependents > 0) return null;
  const answer = p.about.parentsAsDependents;
  const set = (v: boolean) => update((x) => void (x.about.parentsAsDependents = v));
  return (
    <div className={`rounded-2xl px-5 py-4 ring-1 ring-inset ${error ? 'bg-danger/5 ring-danger/30' : 'bg-champagne/10 ring-champagne/25'}`}>
      <p id="parents-q" className="text-sm font-semibold text-evergreen">
        You send {money(support)} home every month. Should we count your parents as dependents?
      </p>
      <p className="mt-1 text-[13px] text-grey">If they rely on this money, your plan should include term cover for them. You can change this later in Settings.</p>
      <div className="mt-3 flex gap-2" role="radiogroup" aria-labelledby="parents-q" aria-describedby={error ? 'parents-err' : undefined}>
        <Button size="sm" variant={answer === true ? 'primary' : 'secondary'} role="radio" aria-checked={answer === true} onClick={() => set(true)}>
          Yes, count them
        </Button>
        <Button size="sm" variant={answer === false ? 'primary' : 'secondary'} role="radio" aria-checked={answer === false} onClick={() => set(false)}>
          No
        </Button>
      </div>
      {error && (
        <p id="parents-err" role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function StepCashflow({ p, update, errs = {} }: StepProps) {
  const money = useMoney();
  const cf = monthlyCashflow(p);
  return (
    <div className="grid gap-10 xl:grid-cols-12">
      <div className="space-y-10 xl:col-span-8">
        <ParentsQuestion p={p} update={update} error={errs.parents} />
        {errs.items && (
          <p role="alert" className="text-sm text-danger">
            {errs.items}
          </p>
        )}
        {errs.loans && (
          <p role="alert" className="text-sm text-danger">
            {errs.loans}
          </p>
        )}
        <section>
          <h2 className="text-[15px] font-semibold">Essential expenses</h2>
          <p className="mb-3 text-[13px] text-grey">Costs you would still pay if your income stopped.</p>
          <LineItemsEditor title="Essential expenses" items={p.cashflow.essential} onChange={(items) => update((x) => void (x.cashflow.essential = items))} addLabel="Add essential expense" />
        </section>
        <section>
          <h2 className="text-[15px] font-semibold">Lifestyle expenses</h2>
          <p className="mb-3 text-[13px] text-grey">Spending you choose and could reduce.</p>
          <LineItemsEditor title="Lifestyle expenses" items={p.cashflow.lifestyle} onChange={(items) => update((x) => void (x.cashflow.lifestyle = items))} addLabel="Add lifestyle expense" />
        </section>
        <section>
          <h2 className="text-[15px] font-semibold">Debt repayments</h2>
          <p className="mb-3 text-[13px] text-grey">EMIs and minimum card payments. You’ll add balances and rates in the next step.</p>
          <LoansEditor loans={p.liabilities} columns={['kind', 'label', 'emi']} onChange={(l) => update((x) => void (x.liabilities = l))} />
        </section>
        <section>
          <h2 className="text-[15px] font-semibold">Savings & investments — transfers, not expenses</h2>
          <p className="mb-4 text-[13px] text-grey">Money you move to your future self each month. It stays yours, so it is not counted as spending.</p>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Monthly investments (SIPs etc.)">
              {(id) => <MoneyInput id={id} value={p.cashflow.monthlyInvestments} max={1e8} onChange={(v) => update((x) => void (x.cashflow.monthlyInvestments = v))} />}
            </Field>
            <Field label="Monthly savings to bank / emergency fund">
              {(id) => <MoneyInput id={id} value={p.cashflow.monthlySavings} max={1e8} onChange={(v) => update((x) => void (x.cashflow.monthlySavings = v))} />}
            </Field>
          </div>
        </section>
      </div>
      <aside aria-label="Your month" className="xl:col-span-4">
        <div className="panel sticky top-32 p-6">
          <p className="eyebrow mb-4">Your month</p>
          <dl className="space-y-2 text-sm">
            {[
              ['Income', cf.income],
              ['− Essential', cf.essential],
              ['− Lifestyle', cf.lifestyle],
              ['− Debt repayments', cf.debtPayments],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between">
                <dt className="text-grey">{k}</dt>
                <dd className="num">{money(v as number)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-line pt-2 font-semibold">
              <dt>Investable surplus</dt>
              <dd className={`num ${cf.investableSurplus < 0 ? 'text-danger' : 'text-evergreen'}`}>{money(cf.investableSurplus)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-grey">Planned transfers</dt>
              <dd className="num">{money(cf.plannedInvestments + cf.plannedSavings)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-grey">Unallocated</dt>
              <dd className={`num ${cf.unallocated < 0 ? 'text-danger' : ''}`}>{money(cf.unallocated)}</dd>
            </div>
          </dl>
          {cf.unallocated < 0 && <p className="mt-3 text-xs text-danger">Your planned transfers exceed your surplus. The plan will invest only what is actually available.</p>}
          {cf.income > 0 && <p className="mt-3 text-xs text-grey">Savings rate: {formatPct(cf.savingsRate)}</p>}
        </div>
      </aside>
    </div>
  );
}

function StepPosition({ p, update, errs = {} }: StepProps) {
  const money = useMoney();
  const bs = balanceSheet(p);
  return (
    <div className="grid gap-10 xl:grid-cols-12">
      <div className="space-y-10 xl:col-span-8">
        <section className="grid gap-6 sm:grid-cols-2">
          <h2 className="text-[15px] font-semibold sm:col-span-2">Cash</h2>
          <Field label="Bank savings" hint="Savings and current accounts, excluding the emergency fund.">
            {(id, d) => <MoneyInput id={id} describedBy={d} value={p.position.cashSavings} max={1e10} onChange={(v) => update((x) => void (x.position.cashSavings = v))} />}
          </Field>
          <Field label="Emergency reserve" hint="Money ring-fenced for emergencies: liquid fund, sweep FD and similar.">
            {(id, d) => <MoneyInput id={id} describedBy={d} value={p.position.emergencyFund} max={1e10} onChange={(v) => update((x) => void (x.position.emergencyFund = v))} />}
          </Field>
        </section>
        <section>
          <h2 className="text-[15px] font-semibold">Investments by asset class</h2>
          <p className="mb-4 text-[13px] text-grey">Current market value. Approximate figures are fine.</p>
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {ASSET_CLASSES.map((c) => (
              <Field key={c} label={ASSET_LABELS[c]}>
                {(id) => <MoneyInput id={id} value={p.position.holdings[c]} max={1e10} onChange={(v) => update((x) => void (x.position.holdings[c] = v))} />}
              </Field>
            ))}
          </div>
        </section>
        <section className="grid gap-6 sm:grid-cols-2">
          <h2 className="text-[15px] font-semibold sm:col-span-2">Retirement savings (EPF, PPF, NPS)</h2>
          <Field label="Combined balance">
            {(id) => <MoneyInput id={id} value={p.position.retirement.balance} max={1e10} onChange={(v) => update((x) => void (x.position.retirement.balance = v))} />}
          </Field>
          <Field label="Monthly contribution" hint="Include contributions deducted before take-home, such as EPF.">
            {(id, d) => <MoneyInput id={id} describedBy={d} value={p.position.retirement.monthlyContribution} max={1e7} onChange={(v) => update((x) => void (x.position.retirement.monthlyContribution = v))} />}
          </Field>
          <Field label="Other assets" optional hint="Vehicle, property you own, etc. Held at a constant value in projections.">
            {(id, d) => <MoneyInput id={id} describedBy={d} value={p.position.otherAssets} max={1e10} onChange={(v) => update((x) => void (x.position.otherAssets = v))} />}
          </Field>
        </section>
        <section>
          <h2 className="text-[15px] font-semibold">Outstanding loans</h2>
          <p className="mb-3 text-[13px] text-grey">The same loans as the previous step. Add outstanding balances and interest rates.</p>
          <LoansEditor loans={p.liabilities} columns={['label', 'balance', 'rate']} onChange={(l) => update((x) => void (x.liabilities = l))} />
          {errs.loans && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {errs.loans}
            </p>
          )}
        </section>
      </div>
      <aside aria-label="Starting position" className="xl:col-span-4">
        <div className="panel sticky top-32 p-6">
          <p className="eyebrow mb-4">Starting position</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-grey">Total assets</dt><dd className="num">{money(bs.totalAssets)}</dd></div>
            <div className="flex justify-between"><dt className="text-grey">Liabilities</dt><dd className="num">{money(bs.liabilities)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Net worth</dt><dd className={`num ${bs.netWorth < 0 ? 'text-danger' : 'text-evergreen'}`}>{money(bs.netWorth)}</dd></div>
          </dl>
        </div>
      </aside>
    </div>
  );
}

function StepProtection({ p, update }: StepProps) {
  const ef = emergencyPlan(p);
  return (
    <div className="grid max-w-3xl gap-10">
      <section className="grid gap-6">
        <Slider label="Emergency fund target" value={p.protection.emergencyTargetMonths} min={3} max={12} step={1} format={(v) => `${v} months`} onChange={(v) => update((x) => void (x.protection.emergencyTargetMonths = v))} help="Months of essential expenses and EMIs to hold in liquid savings. Those with variable income or dependents often aim higher." />
        <Notice tone={ef.gap > 0 ? 'warning' : 'info'}>
          Your target reserve is <strong className="num">{formatINR(ef.recommendedReserve)}</strong>. Liquid savings of <span className="num">{formatINR(ef.eligibleLiquid)}</span> cover {ef.coverageMonths === Infinity ? 'all' : ef.coverageMonths.toFixed(1)} months{ef.gap > 0 ? `, leaving a gap of ${formatINR(ef.gap)}.` : '. You’re covered.'}
        </Notice>
      </section>
      <section className="grid gap-6 sm:grid-cols-2">
        <Field label="Health insurance cover" optional hint="Total sum insured, including any employer policy.">
          {(id, d) => <MoneyInput id={id} describedBy={d} value={p.protection.healthCover} max={1e9} onChange={(v) => update((x) => void (x.protection.healthCover = v))} />}
        </Field>
        <Field
          label="Term life cover"
          optional
          hint={hasDependents(p) ? 'Sum assured on term insurance. People rely on your income, so a common benchmark is 10× your annual income.' : 'Sum assured on term insurance. Most relevant if others depend on your income.'}
        >
          {(id, d) => <MoneyInput id={id} describedBy={d} value={p.protection.lifeCover} max={1e10} onChange={(v) => update((x) => void (x.protection.lifeCover = v))} />}
        </Field>
        <Field label="Health premium you pay for your parents, a year" optional hint={`Deductible in the old regime (${sectionLabel('80D')}): up to ₹25,000, or ₹50,000 if a parent is 60 or older.`}>
          {(id, d) => <MoneyInput id={id} describedBy={d} value={p.income.salary?.sec80DParents ?? 0} max={1e6} onChange={(v) => update((x) => void (x.income.salary = { ...(x.income.salary ?? {}), sec80DParents: v }))} />}
        </Field>
        <div className="flex items-end">
          <Toggle checked={p.income.salary?.parentsSenior ?? false} onChange={(v) => update((x) => void (x.income.salary = { ...(x.income.salary ?? {}), parentsSenior: v }))} label="A parent is 60 or older" />
        </div>
      </section>
      <Disclaimer>We don’t recommend specific insurers or policies. Cover amounts are only used for the educational health score.</Disclaimer>
    </div>
  );
}

function StepGoals({ p, update }: StepProps) {
  const money = useMoney();
  const [editing, setEditing] = useState<Goal | null>(null);
  const quick: GoalCategory[] = ['education', 'travel', 'car', 'wedding', 'home', 'business', 'family'];
  const save = (g: Goal) => {
    update((x) => {
      const i = x.goals.findIndex((y) => y.id === g.id);
      if (i >= 0) x.goals[i] = g;
      else x.goals.push(g);
    });
    setEditing(null);
  };
  return (
    <div className="max-w-3xl">
      {editing ? (
        <div className="panel p-5 sm:p-6">
          <h2 className="mb-5 text-[15px] font-semibold">{p.goals.some((g) => g.id === editing.id) ? 'Edit goal' : 'New goal'}</h2>
          <GoalForm initial={editing} startYear={p.planStartYear} onSave={save} onCancel={() => setEditing(null)} />
        </div>
      ) : (
        <>
          {p.goals.length > 0 && (
            <ul className="mb-8 border-t border-line">
              {p.goals.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4">
                  <div>
                    <p className="font-semibold text-evergreen">{g.name}</p>
                    <p className="num text-[13px] text-grey">
                      {money(g.cost)} today · {g.targetYear} · {PRIORITY_LABEL[g.priority]} priority
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => setEditing(g)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => update((x) => void (x.goals = x.goals.filter((y) => y.id !== g.id)))} aria-label={`Delete ${g.name}`}>
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="eyebrow mb-3">Add a goal</p>
          <div className="flex flex-wrap gap-2">
            {quick.map((c) => (
              <Button key={c} variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setEditing(newGoal(c, p.planStartYear))}>
                {GOAL_CATEGORIES[c].label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={() => setEditing(newGoal('other', p.planStartYear))}>
              Other
            </Button>
          </div>
          <p className="mt-6 text-[13px] text-grey">Financial independence is tracked automatically from the age you chose in step 1. You don’t need to add it as a goal.</p>
        </>
      )}
    </div>
  );
}

function StepPreferences({ p, update, errs = {} }: StepProps) {
  return (
    <div className="grid max-w-3xl gap-10">
      <Notice>Risk preferences are educational inputs that set the return assumptions in your projections. They don’t mean any portfolio is suitable for you.</Notice>
      <fieldset>
        <legend className="mb-3 text-[15px] font-semibold">How would you describe your comfort with investment ups and downs?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(PRESETS) as RiskProfile[]).map((k) => (
            <label key={k} className={`flex cursor-pointer gap-3 rounded-2xl border p-5 transition-colors duration-300 ${p.preferences.risk === k ? 'border-evergreen bg-mint/50' : 'border-line hover:border-sage'}`}>
              <input
                type="radio"
                name="risk"
                className="mt-1 accent-[rgb(var(--c-forest))]"
                checked={p.preferences.risk === k}
                onChange={() =>
                  update((x) => {
                    x.preferences.risk = k;
                    x.preferences.targetAllocation = { ...PRESETS[k].weights };
                  })
                }
              />
              <span>
                <span className="block font-semibold text-evergreen">{PRESETS[k].label}</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-grey">{PRESETS[k].description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <section>
        <h2 className="mb-1 text-[15px] font-semibold">Target allocation</h2>
        <p className="mb-4 text-[13px] text-grey">Pre-filled from the example you chose above. Adjust it freely. Weights must total 100%.</p>
        <AllocationEditor weights={p.preferences.targetAllocation} onChange={(w) => update((x) => void (x.preferences.targetAllocation = w))} />
        {errs.alloc && <p className="mt-2 text-sm text-danger">{errs.alloc}</p>}
      </section>
    </div>
  );
}

function ReviewBlock({ title, step, goTo, rows }: { title: string; step: number; goTo: (n: number) => void; rows: [string, string][] }) {
  return (
    <section className="border-t border-line py-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => goTo(step)}>
          Edit
        </Button>
      </div>
      <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-line/50 pb-1.5">
            <dt className="text-grey">{k}</dt>
            <dd className="num text-right font-medium text-charcoal">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function StepReview({ p, goTo }: { p: FinancialProfile; goTo: (n: number) => void }) {
  const money = useMoney();
  const assumptions = useStore((s) => s.assumptions);
  const cf = monthlyCashflow(p);
  const bs = balanceSheet(p);
  const issues = useMemo(() => validateProfile(p, assumptions), [p, assumptions]);
  return (
    <div className="max-w-4xl">
      {issues.length > 0 && (
        <div className="mb-6 space-y-2">
          {issues.map((i) => (
            <Notice key={i.field + i.message} tone={i.severity === 'error' ? 'error' : 'warning'}>
              {i.message}
            </Notice>
          ))}
        </div>
      )}
      <ReviewBlock title="About you" step={0} goTo={goTo} rows={[['Name', p.about.name || '—'], ['Age', String(p.about.age)], ['Employment', p.about.employment], ['FI target age', String(p.about.fiAge)], ['Dependents', p.about.dependents === 0 && hasDependents(p) ? 'Parents (you send money home)' : String(p.about.dependents)]]} />
      <ReviewBlock title="Income" step={1} goTo={goTo} rows={[p.income.mode === 'ctc' ? ['Annual CTC', money(p.income.ctc ?? 0)] : ['Take-home', money(p.income.monthlyTakeHome)], ['Monthly take-home', money(monthlyCashflow(p).income - p.income.otherMonthlyIncome)], ['Salary growth', formatPct(p.income.salaryGrowth)], ['Other income', money(p.income.otherMonthlyIncome)]]} />
      <ReviewBlock title="Monthly cash flow" step={2} goTo={goTo} rows={[['Essential', money(cf.essential)], ['Lifestyle', money(cf.lifestyle)], ['Debt repayments', money(cf.debtPayments)], ['Investable surplus', money(cf.investableSurplus)], ['Investments', money(cf.plannedInvestments)], ['Savings', money(cf.plannedSavings)]]} />
      <ReviewBlock title="Current position" step={3} goTo={goTo} rows={[['Cash & reserve', money(bs.cash)], ['Investments', money(bs.investments)], ['Retirement', money(bs.retirement)], ['Other assets', money(bs.otherAssets)], ['Liabilities', money(bs.liabilities)], ['Net worth', money(bs.netWorth)]]} />
      <ReviewBlock title="Protection" step={4} goTo={goTo} rows={[['Emergency target', `${p.protection.emergencyTargetMonths} months`], ['Health cover', money(p.protection.healthCover)], ['Life cover', money(p.protection.lifeCover)]]} />
      <section className="border-t border-line py-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Goals</h2>
          <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => goTo(5)}>
            Edit
          </Button>
        </div>
        {p.goals.length === 0 ? (
          <p className="text-sm text-grey">No goals yet. You can add them any time in the Goals Planner.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {p.goals.map((g) => (
              <li key={g.id} className="flex flex-wrap justify-between gap-2 border-b border-line/50 pb-1.5">
                <span>
                  {g.name} <Badge>{PRIORITY_LABEL[g.priority]}</Badge>
                </span>
                <span className="num text-grey">
                  {money(g.cost)} today · {g.targetYear}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ReviewBlock title="Investment preferences" step={6} goTo={goTo} rows={[['Risk example', PRESETS[p.preferences.risk].label], ...ASSET_CLASSES.filter((c) => p.preferences.targetAllocation[c] > 0).map((c) => [ASSET_LABELS[c], formatPct(p.preferences.targetAllocation[c], 0)] as [string, string])]} />
      <p className="mt-4 text-xs text-grey">
        By generating a plan you acknowledge it is an educational projection, not financial advice.{' '}
        <Link className="link" to="/legal#disclaimers" target="_blank">
          Read the disclaimers
        </Link>
        .
      </p>
    </div>
  );
}
