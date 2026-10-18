import { useNavigate } from 'react-router-dom';
import { Download, FileText, RotateCcw, Trash2 } from 'lucide-react';
import { usePlan } from '@/state/selectors';
import { useStore } from '@/state/store';
import { useTheme, type ThemePref } from '@/theme/ThemeProvider';
import { PageHeader, Section, Field, TextInput, NumberInput, MoneyInput, PercentInput, Segmented, Toggle, Button, ButtonLink, Notice, Disclaimer, confirmAction, toast } from '@/components/ui';
import { AGE_MAX, AGE_MIN, ageError, fiAgeBounds, fiAgeError, validateProfile } from '@/finance/validate';
import { familySupportMonthly } from '@/finance/household';
import { exportData, exportSummary } from '@/services/export';
import { DISCLAIMER_TEXT } from '@/pages/public/Legal';
import { DEFAULT_ASSUMPTIONS } from '@/state/demo';
import { ALL_DATED, CPI_LATEST, EPF_RATE, HEALTHCARE_INFLATION, PLANNING_INFLATION, SMALL_SAVINGS, WITHDRAWAL_RATE, type CityTier, type Dated } from '@/finance/assumptions';
import { Select } from '@/components/ui';
import { formatPct } from '@/finance/money';

/** One line of "value · as of · source" for the rates-and-rules table. */
function datedValue(d: Dated<unknown>): string {
  const v = d.value;
  if (d.display) return d.display;
  if (typeof v === 'number') return v < 1 ? formatPct(v, 2) : v.toLocaleString('en-IN');
  if (typeof v === 'string') return v;
  return 'See source';
}

export default function Settings() {
  const plan = usePlan();
  const navigate = useNavigate();
  const s = useStore();
  const { profile: p, assumptions: a } = plan;
  const issues = validateProfile(p, a);
  const theme = useTheme();

  const resetDemo = async () => {
    if (await confirmAction({ title: 'Reset to the demo profile?', body: 'This replaces your current profile, goals, events and assumptions with the fictional demo data.', confirmLabel: 'Reset to demo', danger: true })) {
      s.loadDemo();
      toast('Demo profile loaded');
    }
  };
  const erase = async () => {
    if (await confirmAction({ title: 'Erase all data?', body: 'Everything stored by Earn to Equity in this browser will be deleted. This cannot be undone.', confirmLabel: 'Erase everything', danger: true })) {
      s.clearAll();
      try { localStorage.removeItem('e2e:v1'); } catch { /* storage unavailable */ }
      toast('All data erased');
      navigate('/');
    }
  };

  return (
    <div className="flex flex-col gap-14">
      <PageHeader title="Settings" description="Your profile, assumptions, display preferences and data." />
      {issues.length > 0 && <div className="space-y-2">{issues.map((i) => <Notice key={i.field + i.message} tone={i.severity === 'error' ? 'error' : 'warning'}>{i.message}</Notice>)}</div>}

      <Section title="Personal profile" description="Re-run the guided setup any time, or edit the essentials here.">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="First name" optional>{(id) => <TextInput id={id} value={p.about.name} maxLength={40} onChange={(e) => s.updateProfile((x) => void (x.about.name = e.target.value))} />}</Field>
          <Field label="Age" hint={`${AGE_MIN} to ${AGE_MAX}, on 1 January.`} error={ageError(p.about.age)}>
            {(id, d, invalid) => <NumberInput native id={id} describedBy={d} invalid={invalid} value={p.about.age} min={AGE_MIN} max={AGE_MAX} onChange={(v) => Number.isFinite(v) && s.updateProfile((x) => void (x.about.age = v))} />}
          </Field>
          <Field label="FI target age" error={ageError(p.about.age) ? null : fiAgeError(p.about.fiAge, p.about.age)}>
            {(id, d, invalid) => <NumberInput native id={id} describedBy={d} invalid={invalid} value={p.about.fiAge} min={fiAgeBounds(p.about.age).min} max={fiAgeBounds(p.about.age).max} onChange={(v) => Number.isFinite(v) && s.updateProfile((x) => void (x.about.fiAge = v))} />}
          </Field>
          <Field label="Dependents" error={!Number.isInteger(p.about.dependents) || p.about.dependents < 0 || p.about.dependents > 15 ? 'Enter a whole number from 0 to 15.' : null}>
            {(id, d, invalid) => <NumberInput native id={id} describedBy={d} invalid={invalid} value={p.about.dependents} min={0} max={15} onChange={(v) => Number.isFinite(v) && s.updateProfile((x) => void (x.about.dependents = v))} />}
          </Field>
          <Field label="Health cover">{(id) => <MoneyInput id={id} value={p.protection.healthCover} max={1e9} onChange={(v) => s.updateProfile((x) => void (x.protection.healthCover = v))} />}</Field>
          <Field label="Term life cover">{(id) => <MoneyInput id={id} value={p.protection.lifeCover} max={1e10} onChange={(v) => s.updateProfile((x) => void (x.protection.lifeCover = v))} />}</Field>
          <Field label="City" help="Sets the health-cover benchmark: ₹10 L for one person in a metro, ₹7.5 L in a tier-2 city, ₹5 L elsewhere.">
            {(id) => (
              <Select id={id} value={p.about.cityTier ?? 1} onChange={(e) => s.updateProfile((x) => void (x.about.cityTier = Number(e.target.value) as CityTier))}>
                <option value={1}>Metro (Mumbai, Delhi NCR, Bengaluru, Pune, Hyderabad, Chennai, Kolkata)</option>
                <option value={2}>Tier-2 city</option>
                <option value={3}>Smaller town</option>
              </Select>
            )}
          </Field>
          <Field label="Retirement balance (EPF/PPF/NPS)">{(id) => <MoneyInput id={id} value={p.position.retirement.balance} max={1e10} onChange={(v) => s.updateProfile((x) => void (x.position.retirement.balance = v))} />}</Field>
          <Field label="Monthly retirement contribution">{(id) => <MoneyInput id={id} value={p.position.retirement.monthlyContribution} max={1e7} onChange={(v) => s.updateProfile((x) => void (x.position.retirement.monthlyContribution = v))} />}</Field>
        </div>
        {familySupportMonthly(p) > 0 && p.about.dependents === 0 && (
          <div className="mt-6 max-w-xl">
            <Toggle
              checked={p.about.parentsAsDependents !== false}
              onChange={(v) => s.updateProfile((x) => void (x.about.parentsAsDependents = v))}
              label="Count my parents as dependents"
              description="You send money home every month. When this is on, the health score and next steps include term cover for them."
            />
          </div>
        )}
        <ButtonLink to="/start" variant="secondary" className="mt-6" onClick={() => s.startOnboarding(true)}>Re-run guided setup</ButtonLink>
      </Section>

      <Section title="Financial assumptions" description="Illustrative inputs used by every projection. Asset-class returns are edited in the Portfolio Builder.">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Inflation" hint={`Default ${formatPct(PLANNING_INFLATION.value, 0)}. Latest CPI: ${formatPct(CPI_LATEST.value, 2)}, ${CPI_LATEST.asOf}.`}>{(id, d) => <PercentInput id={id} describedBy={d} value={a.inflation} max={20} onChange={(v) => s.updateAssumptions({ inflation: v })} />}</Field>
          <Field label="Salary growth">{(id) => <PercentInput id={id} value={p.income.salaryGrowth} min={-20} max={50} onChange={(v) => s.updateProfile((x) => void (x.income.salaryGrowth = v))} />}</Field>
          <Field label="Annual SIP step-up">{(id) => <PercentInput id={id} value={a.sipStepUp} max={50} onChange={(v) => s.updateAssumptions({ sipStepUp: v })} />}</Field>
          <Field label="FI withdrawal rate" help={WITHDRAWAL_RATE.note}>{(id) => <PercentInput id={id} value={a.withdrawalRate} min={0.1} max={10} onChange={(v) => s.updateAssumptions({ withdrawalRate: v })} />}</Field>
          <Field label="Lifestyle creep" hint="Share of each above-inflation raise that goes to spending." help="People spend part of every raise. At 40%, a ₹10,000 real rise in monthly take-home adds ₹4,000 to lifestyle spending, permanently.">
            {(id, d) => <PercentInput id={id} describedBy={d} value={a.lifestyleCreep} max={100} onChange={(v) => s.updateAssumptions({ lifestyleCreep: v })} />}
          </Field>
          <Field label="EPF interest rate" hint={`${formatPct(EPF_RATE.value, 2)} declared for ${EPF_RATE.asOf}.`}>{(id, d) => <PercentInput id={id} describedBy={d} value={a.epfRate} max={15} onChange={(v) => s.updateAssumptions({ epfRate: v })} />}</Field>
          <Field label="Healthcare after FI" hint="Extra monthly cost in today’s ₹, beyond your current spending.">{(id, d) => <MoneyInput id={id} describedBy={d} value={a.postFiHealthcare} max={1e6} onChange={(v) => s.updateAssumptions({ postFiHealthcare: v })} />}</Field>
          <Field label="Healthcare inflation" hint={`Default ${formatPct(HEALTHCARE_INFLATION.value, 0)}, faster than CPI.`}>{(id, d) => <PercentInput id={id} describedBy={d} value={a.healthcareInflation} max={25} onChange={(v) => s.updateAssumptions({ healthcareInflation: v })} />}</Field>
          <Field label="Property growth">{(id) => <PercentInput id={id} value={a.propertyGrowth} min={-10} max={20} onChange={(v) => s.updateAssumptions({ propertyGrowth: v })} />}</Field>
          <Field label="PPF / NPS return" hint={`PPF is ${formatPct(SMALL_SAVINGS.ppf.value)} for ${SMALL_SAVINGS.ppf.asOf}.`}>{(id) => <PercentInput id={id} value={p.position.retirement.returnRate} max={20} onChange={(v) => s.updateProfile((x) => void (x.position.retirement.returnRate = v))} />}</Field>
          <Field label="Cash return">{(id) => <PercentInput id={id} value={a.returns.cash} max={15} onChange={(v) => s.updateAssumptions({ returns: { ...a.returns, cash: v } })} />}</Field>
          <div>
            <p className="mb-1.5 text-[13px] font-medium">Contribution timing</p>
            <Segmented label="Contribution timing" size="sm" value={a.contributionTiming} onChange={(v) => s.updateAssumptions({ contributionTiming: v })} options={[{ value: 'end', label: 'Month-end' }, { value: 'start', label: 'Month-start' }]} />
          </div>
        </div>
        <div className="mt-6 max-w-xl">
          <Toggle checked={a.sweepExcessCash} onChange={(v) => s.updateAssumptions({ sweepExcessCash: v })} label="Invest surplus cash each year" description="At each year-end, cash above your emergency target is moved into your portfolio. Turn off to let it build up in the bank." />
        </div>
        <Button variant="ghost" size="sm" className="mt-4" icon={<RotateCcw size={14} />} onClick={() => { s.updateAssumptions({ ...structuredClone(DEFAULT_ASSUMPTIONS) }); toast('Assumptions restored to defaults'); }}>Restore default assumptions</Button>
      </Section>

      <Section title="Rates and rules used" description="Every dated value the projections rely on, with the date it was checked and its source. Values marked approximate differ between sources; check them before relying on them.">
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="table-fin w-full min-w-[720px]">
            <thead>
              <tr><th scope="col">Item</th><th scope="col">Value</th><th scope="col">As of</th><th scope="col">Source</th></tr>
            </thead>
            <tbody>
              {ALL_DATED.map((d) => (
                <tr key={d.label}>
                  <td className="font-sans text-[13px] font-medium text-evergreen">
                    {d.label}
                    {d.approximate && <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-champagne">Approximate</span>}
                    {d.note && <span className="mt-0.5 block text-xs font-normal text-grey">{d.note}</span>}
                  </td>
                  <td>{datedValue(d)}</td>
                  <td className="font-sans text-[13px] text-grey">{d.asOf}</td>
                  <td className="font-sans text-[13px]"><a className="link" href={d.source} target="_blank" rel="noreferrer noopener">{d.sourceLabel}</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Display">
        <div className="flex max-w-xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-sm font-medium">Theme</p><p className="text-xs text-grey">System follows your device setting.</p></div>
            <Segmented<ThemePref> label="Theme" value={theme.theme} onChange={theme.setTheme} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]} />
          </div>
          <Toggle checked={s.settings.compact} onChange={(v) => s.setSettings({ compact: v })} label="Compact amounts (lakh / crore)" description="Show ₹12.5 L instead of ₹12,50,000. Currency is Indian rupees throughout." />
        </div>
      </Section>

      <Section title="Data" description="Your data is stored only in this browser’s local storage. It is not encrypted, not backed up and not synced across devices.">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" icon={<FileText size={15} />} onClick={() => exportSummary(plan)}>Export summary (.txt)</Button>
          <Button variant="secondary" icon={<Download size={15} />} onClick={() => exportData({ profile: s.profile, assumptions: s.assumptions, scenarioDeltas: s.scenarioDeltas, exportedAt: new Date().toISOString() })}>Export data (.json)</Button>
          <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={resetDemo}>Reset to demo</Button>
          <Button variant="danger" icon={<Trash2 size={15} />} onClick={erase}>Erase all data</Button>
        </div>
      </Section>

      <Section title="Privacy">
        <p className="max-w-2xl text-sm leading-relaxed text-grey">Earn to Equity never asks for bank passwords, card numbers, PAN or Aadhaar. If the AI coach is configured, questions and a summary of calculated figures (without your name) are sent to Google’s Gemini API through a server endpoint. Otherwise everything runs in your browser.</p>
      </Section>

      <Section title="Financial disclaimer">
        <div className="max-w-3xl space-y-3">{DISCLAIMER_TEXT.map((t) => <Disclaimer key={t.slice(0, 20)}>{t}</Disclaimer>)}</div>
      </Section>
    </div>
  );
}
