import { useState } from 'react';
import { ASSET_CLASSES } from '@/types/profile';
import { useStore } from '@/state/store';
import { Field, PercentInput, NumberInput } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { CORRELATIONS, INR_DEPRECIATION, REGULAR_PLAN_DRAG } from '@/finance/assumptions';
import { ASSET_SHORT, correlationProblem } from '@/finance/portfolio';
import { formatPct } from '@/finance/money';

/**
 * Settings for people who want to change the model itself: the correlation matrix behind volatility and the
 * Monte Carlo, rupee depreciation, the regular-plan cost and the NPS return. Hidden behind a disclosure.
 */
export function AdvancedAssumptions() {
  const a = useStore((s) => s.assumptions);
  const update = useStore((s) => s.updateAssumptions);
  const current = a.correlations ?? CORRELATIONS.value;
  const [draft, setDraft] = useState<number[][]>(() => current.map((r) => [...r]));
  const problem = correlationProblem(draft);
  const drag = a.regularPlanDrag ?? REGULAR_PLAN_DRAG.value;

  const setCell = (i: number, j: number, v: number) =>
    setDraft((m) => {
      const next = m.map((r) => [...r]);
      next[i][j] = v;
      next[j][i] = v;
      return next;
    });

  return (
    <details className="mt-6">
      <summary className="tap flex cursor-pointer items-center text-[13px] font-medium text-forest">Advanced: correlations, rupee, fund-plan costs, NPS</summary>
      <div className="mt-5 flex flex-col gap-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Rupee depreciation vs USD" hint={`Default ${formatPct(INR_DEPRECIATION.value, 0)}. Added to international equity returns.`} help={INR_DEPRECIATION.note}>
            {(id, d) => <PercentInput id={id} describedBy={d} value={a.inrDepreciation ?? 0} min={-5} max={10} onChange={(v) => update({ inrDepreciation: v })} />}
          </Field>
          <Field label="Regular plans: extra cost, equity" hint="Approximate; check each fund’s TER on AMFI.">
            {(id, d) => <PercentInput id={id} describedBy={d} value={drag.equity} max={3} onChange={(v) => update({ regularPlanDrag: { ...drag, equity: v } })} />}
          </Field>
          <Field label="Regular plans: extra cost, debt">
            {(id) => <PercentInput id={id} value={drag.debt} max={3} onChange={(v) => update({ regularPlanDrag: { ...drag, debt: v } })} />}
          </Field>
          <Field label="NPS return" optional hint="Leave at 0 to use your portfolio’s own return.">
            {(id, d) => <PercentInput id={id} describedBy={d} value={a.npsReturn ?? 0} max={20} onChange={(v) => update({ npsReturn: v > 0 ? v : undefined })} />}
          </Field>
        </div>

        <fieldset>
          <legend className="text-[13px] font-medium">Correlation between asset classes</legend>
          <p className="mt-1 max-w-2xl text-xs text-grey">{CORRELATIONS.note} Editing one cell sets its mirror too.</p>
          <div className="-mx-1 mt-3 overflow-x-auto px-1">
            <table className="table-fin min-w-[640px]">
              <thead>
                <tr>
                  <th scope="col"><span className="sr-only">Asset class</span></th>
                  {ASSET_CLASSES.map((c) => <th key={c} scope="col" className="text-right">{ASSET_SHORT[c]}</th>)}
                </tr>
              </thead>
              <tbody>
                {ASSET_CLASSES.map((r, i) => (
                  <tr key={r}>
                    <th scope="row" className="font-sans text-[13px] font-medium">{ASSET_SHORT[r]}</th>
                    {ASSET_CLASSES.map((c, j) => (
                      <td key={c} className="text-right">
                        {i === j ? (
                          <span className="num text-grey">1</span>
                        ) : j < i ? (
                          <span className="num text-grey">{draft[i][j]}</span>
                        ) : (
                          <NumberInput size="sm" className="ml-auto w-20" ariaLabel={`Correlation, ${ASSET_SHORT[r]} and ${ASSET_SHORT[c]}`} value={draft[i][j]} min={-1} max={1} step={0.05} onChange={(v) => Number.isFinite(v) && setCell(i, j, v)} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {problem && <p role="alert" className="mt-2 text-sm text-danger">{problem}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" disabled={!!problem} onClick={() => update({ correlations: draft.map((r) => [...r]) })}>Use these correlations</Button>
            <Button size="sm" variant="ghost" onClick={() => { setDraft(CORRELATIONS.value.map((r) => [...r])); update({ correlations: undefined }); }}>Restore defaults</Button>
          </div>
        </fieldset>
      </div>
    </details>
  );
}
