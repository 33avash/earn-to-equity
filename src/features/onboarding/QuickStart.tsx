import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useStore } from '@/state/store';
import { useExploreDemo } from '@/state/useDemo';
import { Wordmark } from '@/components/layout/Wordmark';
import { Atmosphere } from '@/components/motion/Motion';
import { Button, Field, MoneyInput, NumberInput, Segmented, Select, Toggle, toast } from '@/components/ui';
import { CITIES, type CityKey } from '@/finance/cities';
import { currentTakeHome } from '@/finance/income';
import { formatINR } from '@/finance/money';
import { AGE_MAX, AGE_MIN, ageError } from '@/finance/validate';
import { QUICK_GOALS, quickStartProfile, type QuickGoal } from '@/state/quickstart';

const YEAR = new Date().getFullYear();

/** Five questions, one screen. Everything else starts from defaults that Overview's accuracy meter points to. */
export default function QuickStart() {
  const navigate = useNavigate();
  const exploreDemo = useExploreDemo();
  const complete = useStore((s) => s.completeOnboarding);
  const [params] = useSearchParams();
  const [age, setAge] = useState(Number(params.get('age')) || 24);
  const [takeHome, setTakeHome] = useState(params.get('takehome') === '1');
  const [pay, setPay] = useState(Number(params.get('ctc')) || (takeHome ? 60_000 : 900_000));
  const [city, setCity] = useState<CityKey>((params.get('city') as CityKey) in CITIES ? (params.get('city') as CityKey) : 'bengaluru');
  const [spending, setSpending] = useState(Number(params.get('spend')) || 35_000);
  const [split, setSplit] = useState(params.has('rent'));
  const [rent, setRent] = useState(Number(params.get('rent')) || 15_000);
  const [goal, setGoal] = useState<QuickGoal>('home');
  const [goalYear, setGoalYear] = useState(YEAR + QUICK_GOALS.home.years);
  const [goalCost, setGoalCost] = useState(QUICK_GOALS.home.cost);
  const [tried, setTried] = useState(false);

  const input = { age, pay, takeHome, city, spending, rent: split ? rent : 0, goal, goalYear, goalCost };
  const profile = useMemo(() => quickStartProfile(input, YEAR), [age, pay, takeHome, city, spending, split, rent, goal, goalYear, goalCost]); // eslint-disable-line react-hooks/exhaustive-deps
  const inHand = currentTakeHome(profile);
  const errors = {
    age: ageError(age),
    pay: pay > 0 ? null : takeHome ? 'Enter your monthly take-home.' : 'Enter your annual CTC.',
    goalYear: goalYear > YEAR && goalYear <= YEAR + 45 ? null : `Pick a year from ${YEAR + 1} to ${YEAR + 45}.`,
  };
  const invalid = Object.values(errors).some(Boolean);

  const chooseGoal = (g: QuickGoal) => {
    setGoal(g);
    setGoalYear(g === 'fi' ? YEAR + Math.max(5, 50 - age) : YEAR + QUICK_GOALS[g].years);
    setGoalCost(QUICK_GOALS[g].cost);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (invalid) return;
    complete(profile);
    toast('Your plan is ready. Add details any time to make it more accurate.');
    navigate('/app');
  };

  const err = (k: keyof typeof errors) => (tried ? errors[k] : null);

  return (
    <div className="relative isolate min-h-[100dvh]">
      <Atmosphere />
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="glass mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 !rounded-full pl-4 pr-2">
          <Wordmark />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => exploreDemo('/app')}>
              Use demo data
            </Button>
            <Link to="/start/detailed" className="hit inline-flex h-9 items-center rounded-full px-3 text-[13px] font-medium text-forest hover:bg-muted">
              Detailed setup
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-10 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-12 lg:pt-16">
        <div className="lg:col-span-7">
          <p className="text-[13px] text-grey">About two minutes</p>
          <h1 className="display mt-2 text-[40px] leading-[1] sm:text-[52px]">Start your plan</h1>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-grey">Five answers build a full 20-year plan. Everything else starts from sensible defaults; Overview shows which details would make it more accurate.</p>

          <form onSubmit={submit} noValidate className="mt-10 flex flex-col gap-7" aria-label="Quick start">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Your age" hint={`On 1 January, ${AGE_MIN} to ${AGE_MAX}.`} error={err('age')}>
                {(id, d, inv) => <NumberInput native id={id} describedBy={d} invalid={inv} value={age} min={AGE_MIN} max={AGE_MAX} onChange={setAge} />}
              </Field>
              <Field label="City" hint="Sets professional tax and the HRA rule.">
                {(id, d) => (
                  <Select id={id} aria-describedby={d} value={city} onChange={(e) => setCity(e.target.value as CityKey)}>
                    {(Object.keys(CITIES) as CityKey[]).map((k) => (
                      <option key={k} value={k}>
                        {CITIES[k].label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <div className="flex flex-col gap-3">
              <Segmented label="How you know your pay" size="sm" value={takeHome ? 'th' : 'ctc'} onChange={(v) => setTakeHome(v === 'th')} options={[{ value: 'ctc', label: 'Annual CTC' }, { value: 'th', label: 'Monthly take-home' }]} />
              <Field label={takeHome ? 'Monthly take-home' : 'Annual CTC'} hint={takeHome ? 'What reaches your bank in a normal month.' : 'From your offer letter.'} error={err('pay')}>
                {(id, d, inv) => <MoneyInput id={id} describedBy={d} invalid={inv} value={pay} max={1e9} onChange={setPay} />}
              </Field>
            </div>

            <div className="flex flex-col gap-3">
              <Field label="Monthly spending, rent included" hint="Rent, food, bills, transport, money sent home, going out.">
                {(id, d) => <MoneyInput id={id} describedBy={d} value={spending} max={1e8} onChange={setSpending} />}
              </Field>
              <Toggle checked={split} onChange={setSplit} label="Split out rent" description="Rent sets your HRA exemption in the old regime." />
              {split && (
                <Field label="Of which rent">
                  {(id) => <MoneyInput id={id} value={rent} max={spending} onChange={setRent} />}
                </Field>
              )}
            </div>

            <fieldset>
              <legend className="mb-3 text-[13px] font-medium">Your top goal</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Top goal">
                {(Object.keys(QUICK_GOALS) as QuickGoal[]).map((g) => (
                  <button key={g} type="button" role="radio" aria-checked={goal === g} onClick={() => chooseGoal(g)} className={`tap rounded-full px-4 py-2 text-[13.5px] font-medium ring-1 ring-inset transition-colors ${goal === g ? 'bg-evergreen text-onbrand ring-evergreen' : 'bg-surface text-charcoal ring-line hover:ring-sage'}`}>
                    {QUICK_GOALS[g].label}
                  </button>
                ))}
              </div>
              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                <Field label={goal === 'fi' ? 'Year you’d like work to be optional' : 'Target year'} error={err('goalYear')}>
                  {(id, d, inv) => <NumberInput native id={id} describedBy={d} invalid={inv} value={goalYear} min={YEAR + 1} max={YEAR + 45} onChange={setGoalYear} />}
                </Field>
                {goal !== 'fi' && (
                  <Field label="Cost in today’s rupees" hint="We inflate it to the target year.">
                    {(id, d) => <MoneyInput id={id} describedBy={d} value={goalCost} max={1e10} onChange={setGoalCost} />}
                  </Field>
                )}
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-7">
              <Button type="submit" size="lg">
                Build my plan <ArrowRight size={16} aria-hidden />
              </Button>
              <Link to="/start/detailed" className="hit text-sm text-grey underline-offset-4 hover:text-evergreen hover:underline">
                Prefer the detailed setup?
              </Link>
            </div>
            {tried && invalid && (
              <p role="alert" className="text-sm text-danger">
                Fix the fields marked in red to continue.
              </p>
            )}
          </form>
        </div>

        <aside aria-label="Your month" className="lg:col-span-5">
          <div className="panel sticky top-28 p-6">
            <p className="eyebrow mb-4">Your month</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-grey">In-hand</dt>
                <dd className="num">{formatINR(inHand)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-grey">Spending</dt>
                <dd className="num">−{formatINR(spending)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-2 font-semibold">
                <dt>Left after bills</dt>
                <dd className={`num ${inHand - spending < 0 ? 'text-danger' : 'text-evergreen'}`}>{formatINR(inHand - spending)}</dd>
              </div>
            </dl>
            {!takeHome && <p className="mt-3 text-xs leading-relaxed text-grey">In-hand assumes basic is 50% of CTC, gratuity is inside CTC and the cheaper tax regime. Variable pay, if any, comes on top once a year; add it later.</p>}
          </div>
        </aside>
      </main>
    </div>
  );
}
